import * as vscode from 'vscode';

export function createStatusBar(ctx: vscode.ExtensionContext) {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  item.text = 'sk-copilot-ai';
  item.show();
  ctx.subscriptions.push(item);
  return item;
}