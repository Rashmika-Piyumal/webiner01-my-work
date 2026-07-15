const WIDGET_SRC = 'http://localhost:5174/widget.js';

export function buildEmbedSnippet(embedKey) {
  return `<script>
  (function(w,d){
    w.ChatBotConfig = { embedKey: '${embedKey}' };
    var s = d.createElement('script');
    s.src = '${WIDGET_SRC}';
    s.async = 1;
    d.head.appendChild(s);
  })(window, document);
</script>`;
}
