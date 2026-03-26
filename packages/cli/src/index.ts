#!/usr/bin/env bun
import {connectCommand} from './commands/connect.js'
import {statusCommand} from './commands/status.js'
import {loginCommand} from './commands/login.js'
import {initCommand} from './commands/init.js'
import {program} from 'commander'

program
	.name('happy')
	.description('Happy Vibecode — remote control for local AI agents')
	.version('0.1.0')

program.addCommand(loginCommand)
program.addCommand(connectCommand)
program.addCommand(initCommand)
program.addCommand(statusCommand)

program.parseAsync(process.argv)
