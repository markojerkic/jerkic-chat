type ThreadInitialScrollScriptProps = {
  scrollContainerId: string;
};

export function ThreadInitialScrollScript({
  scrollContainerId,
}: ThreadInitialScrollScriptProps) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(() => {
  const container = document.getElementById(${JSON.stringify(scrollContainerId)});
  if (!container) return;

  const scroll = () => {
    container.scrollTop = container.scrollHeight;
  };

  scroll();
  requestAnimationFrame(scroll);
  window.addEventListener("load", scroll, { once: true });
})();`,
      }}
    />
  );
}
