import { Messages } from "#bot/utils/classes/message";
import { Parser } from "#bot/utils/classes/parser";
import { WASocket } from "../socket";

export type CommandHandlerFuncContext = { sock: WASocket; msg: Messages; parser: Parser };
export type CommandHandlerFunc = (context: CommandHandlerFuncContext) => Promise<any>;
