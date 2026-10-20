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
    const cleanType = String(type || 'string').toLowerCase().replace(/[^a-z0-9_]/g, '');
    let method = '$table->';

    switch (cleanType) {
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

      case 'ulid':
      case 'ulid_primary':
        return options.primary
          ? `$table->ulid(${colName})->primary();`
          : `$table->ulid(${colName});`;

      case 'string':
      case 'varchar': {
        const length = options.length || 255;
        method += `string(${colName}, ${length})`;
        break;
      }

      case 'char': {
        const length = options.length || 255;
        method += `char(${colName}, ${length})`;
        break;
      }

      case 'text':
        method += `text(${colName})`;
        break;

      case 'mediumtext':
        method += (d === 'postgresql') ? `text(${colName})` : `mediumText(${colName})`;
        break;

      case 'longtext':
        method += (d === 'postgresql') ? `text(${colName})` : `longText(${colName})`;
        break;

      case 'tinyint':
      case 'tinyinteger':
        method += options.unsigned ? `unsignedTinyInteger(${colName})` : `tinyInteger(${colName})`;
        break;

      case 'smallint':
      case 'smallinteger':
        method += options.unsigned ? `unsignedSmallInteger(${colName})` : `smallInteger(${colName})`;
        break;

      case 'mediumint':
      case 'mediuminteger':
        method += options.unsigned ? `unsignedMediumInteger(${colName})` : `mediumInteger(${colName})`;
        break;

      case 'integer':
      case 'int':
        method += options.unsigned ? `unsignedInteger(${colName})` : `integer(${colName})`;
        break;

      case 'bigint':
      case 'biginteger':
        method += options.unsigned ? `unsignedBigInteger(${colName})` : `bigInteger(${colName})`;
        break;

      case 'unsignedbigint':
      case 'unsignedbiginteger':
      case 'foreign_id':
      case 'foreignid':
        method += `unsignedBigInteger(${colName})`;
        break;

      case 'float': {
        const precision = options.precision || 8;
        const scale = options.scale || 2;
        method += `float(${colName}, ${precision}, ${scale})`;
        break;
      }

      case 'double': {
        const precision = options.precision || 15;
        const scale = options.scale || 4;
        method += `double(${colName}, ${precision}, ${scale})`;
        break;
      }

      case 'decimal':
      case 'currency':
      case 'money': {
        const precision = options.precision || options.total || 15;
        const scale = options.scale || options.places || 4;
        method += `decimal(${colName}, ${precision}, ${scale})`;
        break;
      }

      case 'boolean':
      case 'bool':
        method += `boolean(${colName})`;
        break;

      case 'enum': {
        const values = Array.isArray(options.values) ? options.values : (Array.isArray(options.allowed) ? options.allowed : ['active', 'inactive']);
        const valsStr = values.map(v => `'${v}'`).join(', ');
        method += `enum(${colName}, [${valsStr}])`;
        break;
      }

      case 'set': {
        const values = Array.isArray(options.values) ? options.values : ['read', 'write'];
        const valsStr = values.map(v => `'${v}'`).join(', ');
        method += (d === 'postgresql') ? `jsonb(${colName})` : `set(${colName}, [${valsStr}])`;
        break;
      }

      case 'json':
      case 'jsonb':
        if (d === 'postgresql') {
          method += `jsonb(${colName})`; // Native indexed binary JSON
        } else {
          method += `json(${colName})`; // MySQL binary JSON or MariaDB LONGTEXT+JSON_VALID
        }
        break;

      case 'date':
        method += `date(${colName})`;
        break;

      case 'time':
        method += (d === 'postgresql' && options.with_timezone) ? `timeTz(${colName})` : `time(${colName})`;
        break;

      case 'year':
        method += (d === 'postgresql') ? `smallInteger(${colName})` : `year(${colName})`;
        break;

      case 'timestamp':
      case 'datetime':
        if (d === 'postgresql') {
          method += `timestampTz(${colName})`; // Standard with timezone in PostgreSQL
        } else {
          method += options.useDatetime || cleanType === 'datetime' ? `dateTime(${colName})` : `timestamp(${colName})`;
        }
        break;

      case 'binary':
      case 'varbinary':
      case 'blob':
      case 'bytea':
        method += `binary(${colName})`;
        break;

      case 'ip':
      case 'ipaddress':
        if (d === 'postgresql') {
          method += `ipAddress(${colName})`; // Maps to native inet in PostgreSQL
        } else {
          method += `ipAddress(${colName})`; // varchar(45) in MySQL/MariaDB
        }
        break;

      case 'mac':
      case 'macaddress':
        method += `macAddress(${colName})`;
        break;

      case 'geometry':
        method += `geometry(${colName})`;
        break;

      case 'point':
        method += `point(${colName})`;
        break;

      case 'polygon':
        method += `polygon(${colName})`;
        break;

      default:
        method += `string(${colName})`;
        break;
    }

    // Modifiers
    if (options.unsigned && !method.includes('unsigned')) method += '->unsigned()';
    if (options.auto_increment || options.autoincrement) method += '->autoIncrement()';
    if (options.nullable) method += '->nullable()';
    
    if (options.use_current || options.usecurrent) {
      method += '->useCurrent()';
    }
    if (options.use_current_on_update || options.usecurrentonupdate) {
      if (d !== 'postgresql') {
        method += '->useCurrentOnUpdate()';
      }
    }

    if (options.default !== undefined) {
      if (typeof options.default === 'string') {
        method += `->default('${options.default}')`;
      } else {
        method += `->default(${options.default})`;
      }
    }

    if (options.unique) method += '->unique()';
    if (options.index && !options.unique) method += '->index()';
    
    // Position modifiers (MySQL/MariaDB only)
    if (d !== 'postgresql') {
      if (options.after) method += `->after('${options.after}')`;
      if (options.first) method += '->first()';
    }

    // Generated columns
    if (options.stored_as) {
      method += `->storedAs('${options.stored_as}')`;
    } else if (options.virtual_as) {
      method += `->virtualAs('${options.virtual_as}')`;
    }

    if (options.comment) method += `->comment('${options.comment.replace(/'/g, "\\'")}')`;

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
