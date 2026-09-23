import React from 'react';
import { GraduationCap, Lightbulb, Compass, BookOpen } from 'lucide-react';

interface EducationalBannerProps {
  notes: {
    stage: string;
    title: string;
    conceptExplanation: string;
    whyThisMatters: string;
  }[];
}

export const EducationalBanner: React.FC<EducationalBannerProps> = ({ notes }) => {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
        <GraduationCap className="w-4 h-4 flex-shrink-0" />
        <span>Góc Kỹ Thuật: Giải thích Cơ chế RAG & AI Agent cho Kỹ sư</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {notes.map((note, idx) => (
          <div
            key={idx}
            className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-amber-500/30 space-y-2 shadow-sm"
          >
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{note.title}</span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
              {note.conceptExplanation}
            </p>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400">
              <span className="font-semibold text-amber-400 block mb-0.5">Ý nghĩa thực tiễn:</span>
              {note.whyThisMatters}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

