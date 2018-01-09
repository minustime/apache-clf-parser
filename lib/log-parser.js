const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const path = require('path');

class Parser {
  constructor() {
    this.defaults = {
      logs: 'logs',
      report: 'report.csv',
      logSource: '',
      logExtension: 'gz',
      fiterByVerb: ['GET', 'POST'],
      ignoreResource: []
    };
    this.stats = new Map();
    this.options = {};
    this.resourceRegex = '';
  }

  /**
   * Initiates parsing of log files
   */
  async parse(options = {}) {
    try {
      this.options = Object.assign(this.defaults, options);
      this.validateOptions(this.options);
      this.prepareFilter(this.options.fiterByVerb, this.options.ignoreResource);
    } catch (err) {
      return console.error(`Error: ${err.message}`);
    }

    try {
      const files = await this.getLogFiles(this.options.logs, this.options.logExtension);
      const results = await this.processFiles(files);
      this.writeReport(this.options.report, results, this.options.logSource);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }

  /**
   * Validates supplied options
   * @param {object} options
   */
  validateOptions(options) {
    if (!options.hasOwnProperty('logs') || options.logs.trim() === '') {
      throw new Error('Options missing "logs" parameter');
    }
    if (!this.hasExtension(options.report, 'csv')) {
      throw new Error('Report must be of type "csv"');
    }
    if (!fs.existsSync(options.logs)) {
      throw new Error(`Source directory not found, "${options.logs}" not found`);
    }
    if (!Array.isArray(this.options.ignoreResource)) {
      throw new Error(`"ignoreResource" must be an array`);
    }
    if (!Array.isArray(this.options.fiterByVerb)) {
      throw new Error(`"fiterByVerb" must be an array`);
    }
  }

  /**
   * Prepare filter regex based on supplied options
   * @param {array} verbList
   * @param {array} pathList
   */
  prepareFilter(verbList, pathList) {
    const ignoreVerbs = verbList.join('|');
    const ignoreResource = pathList.length ? `(?!(${this.regExpEscape(pathList).join('|')}))` : '';
    this.resourceRegex = new RegExp(`(${ignoreVerbs}) (${ignoreResource}.+) HTTP.+"`);
  }

  /**
   * Escape the dynamic values passed to the RegExp constructor
   * https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
   * @param {array} list
   */
  regExpEscape(list) {
    return list.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  }

  /**
   * Gets a list of all the files to process
   * @param {string} dir
   * @param {string} ext
   */
  getLogFiles(dir, ext = '') {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          return reject(err);
        }

        // Filter file by specified extension
        const paths = files.filter(f => (ext ? this.hasExtension(f, ext) : true));

        // Prepend name of container to file
        resolve(paths.map(f => path.join(dir, f)));
      });
    });
  }

  /**
   * Process all log files
   * @param {array} files
   */
  async processFiles(files) {
    this.log(`Processing ${files.length} file${files.length > 1 ? 's' : ''}`, true);
    await Promise.all(files.map(f => this.processFile(f)));

    // Sort by total count
    return new Map([...this.stats].sort((a, b) => b[1] - a[1]));
  }

  /**
   * Read single log file, extracts resource, updates stats
   * @param {string} file
   */
  processFile(file) {
    return new Promise(async (resolve, reject) => {
      // Read the file line by line, uncompress if gzipped
      const rl = readline.createInterface({
        input: this.hasExtension(file, 'gz')
          ? fs.createReadStream(file).pipe(zlib.createGunzip())
          : fs.createReadStream(file)
      });

      rl.on('line', content => {
        // Extract the resource from the log file, track occurrence totals
        const resource = this.extractResource(content);
        if (resource) {
          this.updateStats(resource);
        }
      });

      rl.on('close', () => {
        resolve(this.stats);
      });
    });
  }

  /**
   * Keeps track item occurrence
   * @param {string} item
   */
  updateStats(item) {
    if (this.stats.has(item)) {
      this.stats.set(item, this.stats.get(item) + 1);
    } else {
      this.stats.set(item, 1);
    }
    this.log(`Parsed ${Number(this.stats.size).toLocaleString()} lines`);
  }

  /**
   * Writes stats to a csv file
   * @param {string} file
   * @param {map} stats
   */
  writeReport(file, stats, logSource) {
    this.log(`Done! writing stats to ${this.options.report}`, true);
    const writeStream = fs.createWriteStream(file);
    writeStream.write(`Resource,Access Count \n`);
    for (let [key, val] of stats) {
      writeStream.write(`"${logSource}${key}",${val}\n`);
    }
  }

  /**
   * Checks if file has specified extension
   * @param {string} f
   * @param {string} ext
   */
  hasExtension(f, ext) {
    return f.substring(f.lastIndexOf('.') + 1) === ext;
  }

  /**
   * Extracts resource part from Apache common log format
   * "%h %l %u %t \"%r\" %>s %b"
   * @param {string} str
   */
  extractResource(str) {
    // const parts = str.match(/"(GET|POST) (.+) HTTP.+"/);
    const parts = str.match(this.resourceRegex);
    return parts ? parts[2] : '';
  }

  /**
   * Prints text to the console
   * @param {string} msg
   * @param {boolean} lineBreak
   */
  log(msg, lineBreak) {
    if (lineBreak) {
      console.log('');
      console.log(msg);
    } else {
      process.stdout.write(`${msg}\r`);
    }
  }
}

module.exports = Parser;
