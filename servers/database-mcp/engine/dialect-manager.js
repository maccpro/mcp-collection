/**
 * Enterprise Database Dialect Manager
 * Deep dialect specifications, data-type mapping, and indexing mechanics for MariaDB, MySQL & PostgreSQL.
 */

export class DialectManager {
  static SUPPORTED_DIALECTS = ['mariadb', 'mysql', 'postgresql'];

  /**
   * Normalize input dialect string
   */
  static normalize(dialect = 'mariadb') {
    const d = String(dialect).toLowerCase().trim();
    if (d === 'postgresql' || d === 'postgres' || d === 'pgsql') return 'postgresql';
    if (d === 'mariadb') return 'mariadb';
    if (d === 'mysql') return 'mysql';
    return 'mariadb';
  }

  /**
   * Get dialect-specific column definition in Laravel Schema syntax
   */
  static mapLaravelColumn(type, name, options = {}, dialect = 'mariadb') {
    const d = this.normalize(dialect);
    const colName = `'${name}'`;
    let method = '$table->';

    switch (type.toLowerCase()) {
      case 'id':
      case 'primary_key':
      case 'bigincrements':
        return `$table->id(${colName});`;

      case 'uuid':
      case 'uuid_primary':
        if (d === 'postgresql') {
          // Native uuid in PostgreSQL with gen_random_uuid()
          return options.primary 
            ? `$table->uuid(${colName})->primary();` 
            : `$table->uuid(${colName});`;
        } else if (d === 'mariadb') {
          // MariaDB 10.7+ has native uuid
          return options.primary 
            ? `$table->uuid(${colName})->primary();` 
            : `$table->uuid(${colName});`;
        } else {
          // MySQL 8+ best practice for B-Tree clustered index: binary(16) or uuid string
          return options.binary 
            ? `$table->binary(${colName}, 16); // Recommended for MySQL ordered UUID`
            : (options.primary ? `$table->uuid(${colName})->primary();` : `$table->uuid(${colName});`);
        }

      case 'string':
      case 'varchar': {
        const length = options.length || 255;
        method += `string(${colName}, ${length})`;
        break;
      }

      case 'text':
        method += `text(${colName})`;
        break;

      case 'longtext':
        method += (d === 'postgresql') ? `text(${colName})` : `longText(${colName})`;
        break;

      case 'integer':
      case 'int':
        method += `integer(${colName})`;
        break;

      case 'bigint':
      case 'biginteger':
        method += `bigInteger(${colName})`;
        break;

      case 'unsignedbigint':
      case 'unsignedbiginteger':
      case 'foreign_id':
        method += `unsignedBigInteger(${colName})`;
        break;

      case 'boolean':
      case 'bool':
        method += `boolean(${colName})`;
        break;

      case 'json':
      case 'jsonb':
        if (d === 'postgresql') {
          method += `jsonb(${colName})`; // Native indexed binary JSON
        } else {
          method += `json(${colName})`; // MySQL binary JSON or MariaDB LONGTEXT+JSON_VALID
        }
        break;

      case 'decimal':
      case 'currency':
      case 'money': {
        const precision = options.precision || 15;
        const scale = options.scale || 4;
        method += `decimal(${colName}, ${precision}, ${scale})`;
        break;
      }

      case 'timestamp':
      case 'datetime':
        if (d === 'postgresql') {
          method += `timestampTz(${colName})`; // With timezone
        } else {
          method += options.useDatetime ? `dateTime(${colName})` : `timestamp(${colName})`;
        }
        break;

      case 'ip':
      case 'ipaddress':
        if (d === 'postgresql') {
          method += `ipAddress(${colName})`; // Maps to native inet in PostgreSQL
        } else {
          method += `ipAddress(${colName})`; // varchar(45) in MySQL/MariaDB
        }
        break;

      default:
        method += `string(${colName})`;
        break;
    }

    // Modifiers
    if (options.nullable) method += '->nullable()';
    if (options.default !== undefined) {
      if (typeof options.default === 'string') {
        method += `->default('${options.default}')`;
      } else {
        method += `->default(${options.default})`;
      }
    }
    if (options.unique) method += '->unique()';
    if (options.index && !options.unique) method += '->index()';
    if (options.comment) method += `->comment('${options.comment}')`;

    return method + ';';
  }

  /**
   * Get Dialect-Specific Zero-Downtime Indexing Directives
   */
  static getIndexConcurrencySyntax(dialect) {
    const d = this.normalize(dialect);
    if (d === 'postgresql') {
      return {
        strategy: 'CREATE INDEX CONCURRENTLY',
        laravel_note: 'In PostgreSQL, execute outside a transaction using DB::statement("CREATE INDEX CONCURRENTLY ...") to avoid table locks.'
      };
    }
    return {
      strategy: 'ALGORITHM=INPLACE, LOCK=NONE',
      laravel_note: 'In MariaDB/MySQL, append ALGORITHM=INPLACE, LOCK=NONE to allow concurrent reads and writes during index builds.'
    };
  }
}
