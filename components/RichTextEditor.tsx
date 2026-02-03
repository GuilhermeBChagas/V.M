import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    return (
        <div className={`relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 ${className}`}>
            <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <button
                    type="button"
                    onClick={() => execCommand('bold')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Negrito"
                >
                    <Bold size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => execCommand('italic')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Itálico"
                >
                    <Italic size={18} />
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
                <button
                    type="button"
                    onClick={() => execCommand('insertUnorderedList')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                    title="Lista"
                >
                    <List size={18} />
                </button>
            </div>
            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    className="p-4 min-h-[150px] outline-none text-slate-700 dark:text-slate-200 prose dark:prose-invert max-w-none"
                    style={{ whiteSpace: 'pre-wrap' }}
                />
                {(!value || value === '<br>') && placeholder && (
                    <div className="absolute top-4 left-4 text-slate-400 pointer-events-none">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
};
