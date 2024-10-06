import { Messages } from "@/utils/classes/message";
import { Parser } from "@/utils/classes/parser";
import { WASocket } from "../socket";

export type CommandHandlerFuncContext = { sock: WASocket; msg: Messages; parser: Parser };
export type CommandHandlerFunc = (context: CommandHandlerFuncContext) => Promise<any>;
