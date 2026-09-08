#!/usr/bin/env bun
import {program} from 'commander'
import pkg from '../package.json' with {type: 'json'}
import {configCommand} from './commands/config.js'
import {connectCommand} from './commands/connect.js'
import {doctorCommand} from './commands/doctor.js'
import {exportCommand} from './commands/export.js'
import {initCommand} from './commands/init.js'
import {loginCommand} from './commands/login.js'
import {providersCommand} from './commands/providers.js'
import {serveCommand} from './commands/serve.js'
import {setupCommand} from './commands/setup.js'
import {statusCommand} from './commands/status.js'
import {whoamiCommand} from './commands/whoami.js'
import {workspaceCommand} from './commands/workspace.js'
import {setDebug} from './utils/log.js'

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
program.addCommand(setupCommand)
program.addCommand(exportCommand)
program.addCommand(connectCommand)
program.addCommand(serveCommand)
program.addCommand(initCommand)
program.addCommand(workspaceCommand)
program.addCommand(configCommand)
program.addCommand(doctorCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)
program.addCommand(providersCommand)

program.parseAsync(process.argv)
