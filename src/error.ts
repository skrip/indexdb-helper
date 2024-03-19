export class IndexDBHelperError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IndexDBHelperError';
  }
}
