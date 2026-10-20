/**
 * @file seeder-generator.js
 * @description Enterprise Laravel Model Factory and Database Seeder Generator.
 * Generates type-safe Faker factories and multi-tenant aware database seeders.
 */

export class SeederGenerator {
  /**
   * Generate Factory & Seeder for an entity
   * @param {Object} params
   * @param {string} params.table_name - Table name (e.g. 'invoices', 'users')
   * @param {string} [params.model_name] - Eloquent model name (inferred if omitted)
   * @param {Array<Object>} [params.columns=[]] - Column specifications
   * @param {number} [params.count=50] - Number of records to seed
   * @param {boolean} [params.is_tenant=false] - Whether model belongs to a tenant
   * @returns {Object} Generated Factory and Seeder PHP code and file paths
   */
  static generate(params = {}) {
    const tableName = (params.table_name || params.table || 'items').toLowerCase().trim();
    const modelName = params.model_name || this._inferModelName(tableName);
    const count = parseInt(params.count || 50, 10);
    const isTenant = params.is_tenant === true || params.include_tenant_id === true;
    const columns = params.columns || [];

    const factoryFields = [];

    if (isTenant) {
      factoryFields.push(`            'tenant_id' => \\App\\Models\\Tenant::factory(),`);
    }

    for (const col of columns) {
      if (['id', 'created_at', 'updated_at', 'deleted_at', 'tenant_id'].includes(col.name)) continue;

      const f = this._mapFakerMethod(col);
      factoryFields.push(`            '${col.name}' => ${f},`);
    }

    if (factoryFields.length === 0) {
      factoryFields.push(`            'name' => $this->faker->name(),`);
      factoryFields.push(`            'status' => $this->faker->randomElement(['active', 'pending', 'inactive']),`);
    }

    const factoryCode = `<?php

declare(strict_types=1);

namespace Database\\Factories;

use App\\Models\\${modelName};
use Illuminate\\Database\\Eloquent\\Factories\\Factory;

/**
 * @extends \\Illuminate\\Database\\Eloquent\\Factories\\Factory<\\App\\Models\\${modelName}>
 */
class ${modelName}Factory extends Factory
{
    protected $model = ${modelName}::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
${factoryFields.join('\n')}
        ];
    }
}
`;

    const seederCode = `<?php

declare(strict_types=1);

namespace Database\\Seeders;

use App\\Models\\${modelName};
use Illuminate\\Database\\Seeder;

class ${modelName}Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
${isTenant ? `        // Ensure at least one tenant exists
        if (\\App\\Models\\Tenant::count() === 0) {
            \\App\\Models\\Tenant::factory()->create();
        }

        // Seed across all active tenants
        \\App\\Models\\Tenant::all()->each(function ($tenant) {
            ${modelName}::factory()->count(${count})->create([
                'tenant_id' => $tenant->id,
            ]);
        });` : `        ${modelName}::factory()->count(${count})->create();`}
    }
}
`;

    const factoryPath = `database/factories/${modelName}Factory.php`;
    const seederPath = `database/seeders/${modelName}Seeder.php`;

    return {
      success: true,
      table_name: tableName,
      model_name: modelName,
      seed_count: count,
      is_tenant: isTenant,
      files: {
        factory: {
          path: factoryPath,
          code: factoryCode
        },
        seeder: {
          path: seederPath,
          code: seederCode
        }
      },
      artisan_commands: {
        run_seeder: `php artisan db:seed --class=${modelName}Seeder`,
        test_in_tinker: `php artisan tinker --execute="${modelName}::factory()->count(5)->create();"`
      }
    };
  }

  static _singularize(word) {
    const w = String(word || '').toLowerCase();
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y'; // categories -> category
    if (w.endsWith('sses')) return w.slice(0, -2); // addresses -> address
    if (w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes')) return w.slice(0, -2);
    if (['status', 'business', 'news', 'series'].includes(w)) return w;
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }

  static _inferModelName(tableName) {
    return tableName
      .split('_')
      .map(part => {
        const sing = this._singularize(part);
        return sing.charAt(0).toUpperCase() + sing.slice(1);
      })
      .join('');
  }

  static _mapFakerMethod(col) {
    const name = col.name.toLowerCase();
    const type = (col.type || '').toLowerCase();

    // Foreign Keys: auto-bind to referenced Model factory to prevent integrity constraint failures
    if (name.endsWith('_id') && name !== 'tenant_id') {
      const parentRaw = name.slice(0, -3);
      const parentModel = parentRaw
        .split('_')
        .map(p => {
          const sing = this._singularize(p);
          return sing.charAt(0).toUpperCase() + sing.slice(1);
        })
        .join('');
      return `\\App\\Models\\${parentModel}::factory()`;
    }

    if (name.includes('email')) return '$this->faker->unique()->safeEmail()';
    if (name.includes('phone') || name.includes('mobile')) return '$this->faker->phoneNumber()';
    if (name.includes('password')) return 'bcrypt(\'secret123\')';
    if (name === 'name' || name === 'full_name' || name.endsWith('_name')) return '$this->faker->name()';
    if (name.includes('title')) return '$this->faker->sentence(3)';
    if (name.includes('slug') || name.includes('code')) return '$this->faker->unique()->slug()';
    if (name.includes('sku')) return 'strtoupper($this->faker->bothify(\'SKU-####-????\'))';
    if (name.includes('address')) return '$this->faker->streetAddress()';
    if (name.includes('city')) return '$this->faker->city()';
    if (name.includes('country')) return '$this->faker->country()';
    if (name.includes('amount') || name.includes('total') || name.includes('price') || name.includes('balance')) {
      return '$this->faker->randomFloat(2, 10, 5000)';
    }
    if (name.includes('quantity') || name.includes('count') || name.includes('qty')) {
      return '$this->faker->numberBetween(1, 100)';
    }
    if (name.includes('status')) {
      const allowed = col.values || col.allowed || ['pending', 'active', 'completed'];
      const vals = allowed.map(v => `'${v}'`).join(', ');
      return `$this->faker->randomElement([${vals}])`;
    }
    if (name.includes('ip')) return '$this->faker->ipv4()';
    if (name.includes('uuid')) return '$this->faker->uuid()';
    if (name.includes('date')) return '$this->faker->date()';

    if (type === 'boolean' || type === 'bool') return '$this->faker->boolean()';
    if (type === 'integer' || type === 'int' || type === 'bigint') return '$this->faker->randomNumber()';
    if (type === 'text' || type === 'longtext') return '$this->faker->paragraph()';
    if (type === 'json' || type === 'jsonb') return '[\'meta\' => $this->faker->word()]';

    return '$this->faker->sentence(4)';
  }
}

export default SeederGenerator;
