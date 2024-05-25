// Packages
import "colors";

// Info
const info = (name: string, message: string): void =>
	console.log(`${"[INFO]".red} [${name.green}] => ${message}`);

// Debug
const debug = (name: string, message: string): void =>
	console.log(`${"[DEBUG]".green} [${name.green}] => ${message}`);

// Error
const error = (name: string, message: string): void =>
	console.log(`${"[ERROR]".red} [${name.green}] => ${message}`);

// Success
const success = (name: string, message: string): void =>
	console.log(`${"[SUCCESS]".green} [${name.green}] => ${message}`);

// Export
export { info, debug, error, success };
