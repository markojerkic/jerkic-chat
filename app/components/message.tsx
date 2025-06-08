type MessageProps = {
  message: {
    id: string;
    textContent: string | null;
    sender: "user" | "llm";
    thread: string;
  };
};

export function Message({ message }: MessageProps) {
  return (
    <pre
      className="
        whitespace-pre-wrap p-3 max-w-md rounded-lg shadow-sm
        data-[sender=user]:bg-blue-600 data-[sender=user]:text-white data-[sender=user]:self-end data-[sender=user]:ml-auto
        data-[sender=llm]:bg-gray-100 data-[sender=llm]:text-gray-900 data-[sender=llm]:self-start data-[sender=llm]:mr-auto
        font-mono text-sm leading-relaxed
        border data-[sender=user]:border-blue-700 data-[sender=llm]:border-gray-200
      "
      data-sender={message.sender}
      data-id={message.id}
    >
      {message.textContent}
    </pre>
  );
}
