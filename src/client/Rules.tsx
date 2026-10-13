import { marked } from 'marked';
import rules from '../../docs/ZASADY.md?raw';

const html = marked.parse(rules, { async: false });

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal rules" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Zamknij">
          ✕
        </button>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
