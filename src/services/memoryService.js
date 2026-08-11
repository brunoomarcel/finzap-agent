/**
 * Short-term Conversation Memory Service
 * Keeps track of recent chat context per user to enable natural multi-turn conversations
 * and prevent repetitive greetings ("Olá Bruno") in short succession.
 */
class MemoryService {
  constructor() {
    // Map of usuarioId -> Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>
    this.userHistories = new Map();
    this.MAX_HISTORY_PER_USER = 10;
    this.CONTEXT_EXPIRATION_MS = 2 * 60 * 60 * 1000; // 2 hours context window
  }

  /**
   * Retrieves recent formatted conversation history for Groq AI
   * @param {string} usuarioId
   * @returns {Array<{ role: string, content: string }>}
   */
  getHistory(usuarioId) {
    if (!this.userHistories.has(usuarioId)) {
      return [];
    }

    const history = this.userHistories.get(usuarioId);
    const now = Date.now();

    // Filter out expired context older than 2 hours
    const validHistory = history.filter(item => (now - item.timestamp) < this.CONTEXT_EXPIRATION_MS);
    this.userHistories.set(usuarioId, validHistory);

    return validHistory.map(item => ({
      role: item.role,
      content: item.content
    }));
  }

  /**
   * Adds a user message to history
   * @param {string} usuarioId
   * @param {string} messageText
   */
  addUserMessage(usuarioId, messageText) {
    this._addMessage(usuarioId, 'user', messageText);
  }

  /**
   * Adds an assistant reply to history
   * @param {string} usuarioId
   * @param {string} replyText
   */
  addAssistantReply(usuarioId, replyText) {
    this._addMessage(usuarioId, 'assistant', replyText);
  }

  _addMessage(usuarioId, role, content) {
    if (!this.userHistories.has(usuarioId)) {
      this.userHistories.set(usuarioId, []);
    }

    const history = this.userHistories.get(usuarioId);
    history.push({
      role,
      content,
      timestamp: Date.now()
    });

    // Keep only last N messages
    if (history.length > this.MAX_HISTORY_PER_USER) {
      history.shift();
    }
  }

  /**
   * Clears history for a user
   * @param {string} usuarioId
   */
  clearHistory(usuarioId) {
    this.userHistories.delete(usuarioId);
  }
}

module.exports = new MemoryService();
