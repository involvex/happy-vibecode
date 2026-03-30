#!/usr/bin/env bun
import {workspaceCommand} from './commands/workspace.js'
import pkg from '../package.json' with {type: 'json'}
import {connectCommand} from './commands/connect.js'
import {whoamiCommand} from './commands/whoami.js'
import {statusCommand} from './commands/status.js'
import {doctorCommand} from './commands/doctor.js'
import {configCommand} from './commands/config.js'
import {serveCommand} from './commands/serve.js'
import {loginCommand} from './commands/login.js'
import {initCommand} from './commands/init.js'
import {setDebug} from './utils/log.js'
import {program} from 'commander'

program
	.name('happy')
	.description('Happy Vibecode — remote control for local AI agents')
	.version(pkg.version)
	.option('--debug', 'Enable debug logging with enhanced output')

program.hook('preAction', thisCommand => {
	const opts = thisCommand.opts()
	if (opts.debug) setDebug(true)
})

program.addCommand(loginCommand)
program.addCommand(connectCommand)
program.addCommand(serveCommand)
program.addCommand(initCommand)
program.addCommand(workspaceCommand)
program.addCommand(configCommand)
program.addCommand(doctorCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)

program.parseAsync(process.argv)
