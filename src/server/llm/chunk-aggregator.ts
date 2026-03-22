export class ChunkAggregator {
  private buffer: string = "";
  private readonly limit: number;

  /**
   * Creates an instance of ChunkAggregator.
   * @param {object} [options] - The configuration options.
   * @param {number} [options.limit=512] - The character limit at which the buffer should be considered "full".
   * This is a balance between frequent, small DB writes and infrequent, large ones. 512 is a reasonable default.
   */
  constructor(options: { limit?: number } = {}) {
    this.limit = options.limit ?? 512;
  }

  /**
   * Appends a string chunk to the internal buffer.
   * @param {string} chunk - The string chunk to append.
   */
  public append(chunk: string): void {
    this.buffer += chunk;
  }

  /**
   * Checks if the buffer's character length has reached or exceeded the limit.
   * @returns {boolean} - True if the limit is reached, false otherwise.
   */
  public hasReachedLimit(): boolean {
    return this.buffer.length >= this.limit;
  }

  /**
   * Returns the entire aggregated content from the buffer and clears it.
   * This is the primary method to use when the limit is reached.
   * @returns {string} - The aggregated string.
   */
  public getAggregateAndClear(): string {
    const aggregate = this.buffer;
    this.buffer = ""; // Reset the buffer for the next batch
    return aggregate;
  }

  /**
   * Returns any remaining content from the buffer and clears it.
   * Useful for flushing the buffer at the end of a stream, even if the limit wasn't reached.
   * @returns {string} - The remaining aggregated string.
   */
  public flush(): string {
    return this.getAggregateAndClear();
  }

  /**
   * Checks if the buffer is currently empty.
   * @returns {boolean} - True if the buffer is empty, false otherwise.
   */
  public isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}
