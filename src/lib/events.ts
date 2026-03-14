export class SuggestedMessageEvent extends CustomEvent<string> {
  constructor(public message: string) {
    super("suggested-message", { detail: message });
  }
}
