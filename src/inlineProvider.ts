import * as vscode from 'vscode';
import startStream from './streaming';
import { getApiKey } from './keyManager';

interface Session {
  buffer: string;
  abort: AbortController;
  editorUri: string;
  active: boolean;
}

export class InlineProvider implements vscode.InlineCompletionItemProvider {
  private sessions = new Map<string, Session>();
  private _onDidChangeInlineCompletions = new vscode.EventEmitter<void>();
  onDidChangeInlineCompletions = this._onDidChangeInlineCompletions.event;

  constructor(
    private context: vscode.ExtensionContext,
    private output: vscode.OutputChannel,
    private statusBar: vscode.StatusBarItem
  ) {
    vscode.window.onDidChangeTextEditorSelection(
      e => this.abortSessions(e.textEditor.document.uri.toString()),
      null,
      context.subscriptions
    );
    vscode.workspace.onDidChangeTextDocument(
      e => this.abortSessions(e.document.uri.toString()),
      null,
      context.subscriptions
    );
  }

  async provideInlineCompletionItems(
    doc: vscode.TextDocument,
    pos: vscode.Position
  ): Promise<vscode.InlineCompletionList> {
    const key = doc.uri.toString() + ':' + pos.line + ':' + pos.character;
    let session = this.sessions.get(key);

    if (!session) {
      const apiKey = await getApiKey(this.context);
      if (!apiKey) return { items: [] };

      const abort = new AbortController();
      session = { buffer: '', abort, editorUri: doc.uri.toString(), active: true };
      this.sessions.set(key, session);

      this.statusBar.text = '$(sync~spin) sk-copilot-ai: generating';
      this.output.appendLine('--- New completion ---');

      const cfg = vscode.workspace.getConfiguration('sk-copilot-ai');
      const apiUrl = cfg.get<string>('apiUrl') || '';

      const prompt = doc.getText(
        new vscode.Range(
          new vscode.Position(Math.max(0, pos.line - 20), 0),
          pos
        )
      );

      startStream({
        apiUrl,
        body: {
          model: cfg.get('model'),
          messages: [
            {
              role: "system",
              content: `
          You are an AI coding assistant inside VS Code.
          Your job is to provide inline code completions like GitHub Copilot.
          Rules:
          - Only output code, no explanations.
          - Suggest the most likely next tokens at the cursor position.
          - Follow the coding style already present (indentation, semicolons, naming).
          - Never repeat existing code above the cursor.
          - Keep suggestions concise and relevant.
              ` },
            { role: "user", content: prompt }
          ],
          temperature: cfg.get('temperature'),
          max_tokens: cfg.get('maxTokens'),
          stream: true
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        signal: abort.signal,
        onToken: t => {
          session!.buffer += t;
          this.output.append(t);
          this._onDidChangeInlineCompletions.fire(); // refresh inline suggestions
        },
        onDone: () => {
          this.statusBar.text = 'sk-copilot-ai';
        },
        onError: e =>
          vscode.window.showErrorMessage('sk-copilot-ai error: ' + e)
      });
    }

    // Show the current buffer as inline suggestion
    if (!session.buffer) {
      return { items: [] };
    }

    const item = new vscode.InlineCompletionItem(
      session.buffer,
      new vscode.Range(pos, pos)
    );
    return { items: [item] };
  }

  private abortSessions(uri: string) {
    for (const [k, s] of this.sessions.entries()) {
      if (s.editorUri === uri && s.active) {
        s.abort.abort();
        this.sessions.delete(k);
      }
    }
    this.statusBar.text = 'sk-copilot-ai';
  }
}
