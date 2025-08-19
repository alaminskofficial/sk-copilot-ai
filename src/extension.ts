import * as vscode from 'vscode';
import { InlineProvider } from './inlineProvider';
import { setApiKey, clearApiKey } from './keyManager';
import { createStatusBar } from './statusBar';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('sk-copilot-ai');
  const statusBar = createStatusBar(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('sk-copilot-ai.setApiKey', async () => await setApiKey(context)),
    vscode.commands.registerCommand('sk-copilot-ai.clearApiKey', async () => await clearApiKey(context)),
  );

  const provider = new InlineProvider(context, output, statusBar);
  context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ scheme: '*', language: '*' }, provider));

  context.subscriptions.push(vscode.commands.registerCommand('sk-copilot-ai.triggerInline', async () => {
    await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
  }));
}

export function deactivate() {}