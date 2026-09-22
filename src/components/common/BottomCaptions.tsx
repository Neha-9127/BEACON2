import React from 'react';

interface CaptionBox {
  id: string;
  headline: string;
  subtext: string;
  tagline: string;
}

const CAPTION_BOXES: CaptionBox[] = [
  {
    id: 'box-1',
    headline: 'Spot it early. Settle it fast.',
    subtext: 'Heard early. Fixed sooner.',
    tagline: 'Rapid civic escalation before issues compound'
  },
  {
    id: 'box-2',
    headline: 'Catch the crack before it becomes a crater.',
    subtext: "Today's whisper, tomorrow's non-problem.",
    tagline: 'Preventive intervention on street & infrastructure safety'
  },
  {
    id: 'box-3',
    headline: "Your street's early-warning system.",
    subtext: 'Hyperlocal community intelligence on patrol.',
    tagline: 'Neighborhood alerting keeping every commuter protected'
  },
  {
    id: 'box-4',
    headline: "Before it's a headline, it's handled.",
    subtext: 'Direct dispatch to municipal & safety crews.',
    tagline: 'Seamless multi-agency response resolving city hazards'
  }
];

export const BottomCaptions: React.FC = () => {
  return (
    <footer id="website-bottom-captions" className="w-full mt-10 pt-8 pb-8 border-t border-slate-200/80 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="text-center mb-5">
          <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase">
            BEACON Civic Mission & Early Warning Network
          </div>
        </div>

        {/* 4 Crisp, Neat Caption Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {CAPTION_BOXES.map((box, index) => (
            <div
              key={box.id}
              id={`caption-box-${index + 1}`}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-sm text-slate-900"
            >
              <div>
                <div className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider mb-2">
                  0{index + 1} • Early Resolution
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight mb-2">
                  "{box.headline}"
                </h4>
                <p className="text-xs font-medium text-slate-600 leading-relaxed italic mb-3">
                  "{box.subtext}"
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                {box.tagline}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
          BEACON Urban Safety & Municipal Triage • Built for Chennai Municipal Corporation & Police Command
        </div>
      </div>
    </footer>
  );
};
