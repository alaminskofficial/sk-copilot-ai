import * as vscode from 'vscode';

const KEY_NAME = 'sk-copilot-ai.apiKey';

export async function setApiKey(ctx: vscode.ExtensionContext) {
  const key = await vscode.window.showInputBox({ prompt: 'Enter API Key', password: true });
  if (key) { await ctx.secrets.store(KEY_NAME, key); vscode.window.showInformationMessage('Key stored'); }
}

export async function clearApiKey(ctx: vscode.ExtensionContext) {
  await ctx.secrets.delete(KEY_NAME);
  vscode.window.showInformationMessage('Key cleared');
}

export async function getApiKey(ctx: vscode.ExtensionContext) {
  return await ctx.secrets.get(KEY_NAME);
}