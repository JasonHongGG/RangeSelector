import { ToolAction } from './ToolAction';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolAction> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(name: string, tool: ToolAction) {
    this.tools.set(name, tool);
  }

  public getTool(name: string): ToolAction | undefined {
    return this.tools.get(name);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
