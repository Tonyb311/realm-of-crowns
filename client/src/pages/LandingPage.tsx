import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  Send,
  Crown,
  Scroll,
  Dice5,
  Globe,
} from 'lucide-react';
import { RealmButton } from '../components/ui/RealmButton';
import { RealmInput } from '../components/ui/RealmInput';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: 'easeOut' as const },
  }),
};

const cardFade = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

// ---------------------------------------------------------------------------
// Vignette data
// ---------------------------------------------------------------------------
const VIGNETTES = [
  {
    title: 'The Chain',
    Icon: Crown,
    body: 'The blacksmith needs the miner who needs the merchant who needs the caravan guard who needs the blacksmith. Twenty-nine professions, none self-sufficient. The economy isn\u2019t a feature \u2014 it\u2019s the reason you need each other.',
  },
  {
    title: 'The Board',
    Icon: Scroll,
    body: 'Someone posted that the mayor is embezzling from the town treasury. The election is in three days. You have evidence. Do you publish it now, or wait until the vote count favors your candidate? The politics aren\u2019t scripted. The drama is real.',
  },
  {
    title: 'The Sheet',
    Icon: Dice5,
    body: 'You join a tavern thread on the forums. Another player inspects your character \u2014 twenty-eight levels of history, a scar from the Battle of Ashenmoor, a political title you won in last month\u2019s election. You didn\u2019t have to say a word. The sheet spoke for you.',
  },
  {
    title: 'The World',
    Icon: Globe,
    body: 'Twenty races across sixty-eight towns. Twelve gods with elected high priests. Racial tensions that simmer for months before someone lights the match. A continent that remembers what you did \u2014 and what you didn\u2019t.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LandingPage() {
  const navigate = useNavigate();
  const [heroEmail, setHeroEmail] = useState('');
  const [heroSubmitted, setHeroSubmitted] = useState(false);
  const [bottomEmail, setBottomEmail] = useState('');
  const [bottomSubmitted, setBottomSubmitted] = useState(false);

  // TODO: Wire Kit (ConvertKit) form action URL here.
  // For now, stores in local state and shows a thank-you message.
  function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (heroEmail.trim()) setHeroSubmitted(true);
  }

  function handleBottomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bottomEmail.trim()) setBottomSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-realm-bg-900 text-realm-text-primary font-body overflow-x-hidden">
      {/* ================================================================= */}
      {/* HERO                                                              */}
      {/* ================================================================= */}
      <section className="relative flex flex-col items-center justify-center px-6 py-20 md:py-28">
        {/* Atmospheric background layers */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #07040F 60%)' }} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(106, 79, 160, 0.2) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(138, 80, 200, 0.08) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-0 bg-realm-vignette pointer-events-none" />

        {/* Pulsing ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(138, 80, 200, 0.06) 0%, transparent 70%)',
            animation: 'pulse-glow 6s ease-in-out infinite',
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-5xl sm:text-6xl md:text-8xl text-realm-gold-400 tracking-wider"
            style={{ textShadow: '0 0 40px rgba(212, 168, 67, 0.3), 0 0 80px rgba(212, 168, 67, 0.1)' }}
          >
            Realm of Crowns
          </motion.h1>

          {/* Gold ornament divider */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-center gap-4 my-5">
            <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-realm-gold-500/40" />
            <div className="w-1.5 h-1.5 rotate-45 border border-realm-gold-500/50" />
            <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-realm-gold-500/40" />
          </motion.div>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-lg sm:text-xl md:text-2xl text-realm-text-primary/90 leading-snug mb-4 px-2"
          >
            Gods scheme. Markets bleed. The mayor just sold your town.
          </motion.p>

          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-sm sm:text-base text-realm-text-secondary mb-3 px-4 max-w-xl mx-auto"
          >
            A persistent world that moves at the pace of life. One action per day. Every choice remembered.
          </motion.p>

          {/* Identity line */}
          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-xs text-realm-text-muted mb-8 px-4 max-w-lg mx-auto tracking-wide uppercase"
          >
            A daily-action MMO and play-by-post RPG, unified by one character sheet
          </motion.p>

          {/* Email capture — compact inline */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="max-w-md mx-auto">
            {heroSubmitted ? (
              <div className="py-3">
                <p className="font-display text-realm-gold-400 text-sm">A raven takes flight.</p>
                <p className="text-realm-text-muted text-xs mt-1">We&apos;ll send word when the gates open.</p>
              </div>
            ) : (
              <form onSubmit={handleHeroSubmit} className="flex gap-2">
                <RealmInput
                  type="email"
                  placeholder="Your email address"
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <RealmButton type="submit" variant="primary" size="md" className="shrink-0 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send a Raven</span>
                </RealmButton>
              </form>
            )}
            <p className="text-realm-text-muted text-[11px] mt-3">
              Already have access?{' '}
              <button onClick={() => navigate('/login')} className="text-realm-gold-400/70 hover:text-realm-gold-400 transition-colors underline underline-offset-2">
                Sign in
              </button>
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-10"
        >
          <ChevronDown className="w-6 h-6 text-realm-gold-400/50 animate-bounce" />
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* TWO-GAME MODEL                                                    */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-16 px-6 relative bg-realm-bg-800">
        <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-realm-bg-900 to-transparent" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-realm-gold-400 text-center mb-3"
          >
            Two Games. One Character.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center text-realm-text-muted text-sm mb-10 max-w-lg mx-auto"
          >
            The game you always wanted someone to build.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* The Realm — MMO side */}
            <motion.div
              variants={cardFade}
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="border border-realm-border rounded-lg p-6 bg-realm-bg-700/50"
            >
              <h3 className="font-display text-xl text-realm-gold-400 mb-4">The Realm</h3>
              <p className="text-sm text-realm-text-secondary leading-relaxed mb-3">
                A living economy where the blacksmith depends on the miner, the miner depends on the merchant, and the merchant depends on safe roads you haven&apos;t patrolled yet. Elect mayors who can tax, legislate, and betray. Travel roads where combat plays out like a tabletop session. Build something that matters.
              </p>
              <p className="text-xs text-realm-text-muted italic">
                One action per day. Real consequences. A world that doesn&apos;t need you to play eight hours to care about you.
              </p>
            </motion.div>

            {/* The Tavern — RP side */}
            <motion.div
              variants={cardFade}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="border border-realm-border rounded-lg p-6 bg-realm-bg-700/50"
            >
              <h3 className="font-display text-xl text-realm-gold-400 mb-4">The Tavern</h3>
              <p className="text-sm text-realm-text-secondary leading-relaxed mb-3">
                The same character sits down at a forum table and tells stories. Dice rolls powered by your real stats. Skill checks that reference your actual abilities. Player-run adventures with narrator tools that feel like a GM screen. Your character sheet bridges both worlds &mdash; and it proves every word.
              </p>
              <p className="text-xs text-realm-text-muted italic">
                Play-by-post roleplay where your character isn&apos;t a fiction &mdash; it&apos;s a record of everything you&apos;ve done.
              </p>
            </motion.div>
          </div>

          {/* Connector */}
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="text-center mt-8"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 bg-realm-gold-600/25" />
              <div className="w-1.5 h-1.5 rotate-45 border border-realm-gold-500/40" />
              <div className="h-px w-12 bg-realm-gold-600/25" />
            </div>
            <p className="text-sm text-realm-text-secondary max-w-md mx-auto leading-relaxed">
              The game builds the character. The character powers the roleplay. The community keeps everyone coming back.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* DAILY-ACTION PITCH                                                */}
      {/* ================================================================= */}
      <section className="py-10 sm:py-14 px-6 relative bg-realm-bg-900">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-2xl sm:text-3xl text-realm-gold-400 text-center mb-3"
          >
            Your Lunch Break. Fifteen Minutes.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center text-realm-text-muted text-xs uppercase tracking-wider mb-8"
          >
            Not a grind. A world that respects your time.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="space-y-4 text-sm text-realm-text-secondary leading-relaxed"
          >
            <p>
              You open the tab. Your wheat fields are ready &mdash; you harvest before the merchant guild raises grain prices again. The mayor posted a new proclamation on the town board; half the council is furious, so you draft a reply. A play-by-post expedition into the Whispering Mire needs a Ranger &mdash; the GM calls for a Survival check, and your sheet says you&apos;ll probably make it.
            </p>
            <p>
              You close the tab. Fifteen minutes. Tomorrow the grain price will have moved, the council will have voted, and the expedition will be deeper into the Mire. The world kept going &mdash; and so did you.
            </p>
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="text-center text-xs text-realm-text-muted mt-8 italic"
          >
            One meaningful action. Real consequences. Then you come back tomorrow.
          </motion.p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* ATMOSPHERIC VIGNETTES                                             */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-14 px-6 relative bg-realm-bg-800">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-realm-gold-400 text-center mb-10"
          >
            A World With Teeth
          </motion.h2>

          <div className="space-y-8">
            {VIGNETTES.map((v, i) => (
              <motion.div
                key={v.title}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="flex items-start gap-5"
              >
                <div className="w-10 h-10 shrink-0 rounded-lg border border-realm-gold-600/20 bg-realm-gold-700/10 flex items-center justify-center mt-0.5">
                  <v.Icon className="w-5 h-5 text-realm-gold-400" />
                </div>
                <div>
                  <h3 className="font-display text-base text-realm-gold-400 mb-2">{v.title}</h3>
                  <p className="text-sm text-realm-text-secondary leading-relaxed">{v.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* COMMUNITY & RP                                                    */}
      {/* ================================================================= */}
      <section className="py-10 sm:py-12 px-6 relative bg-realm-bg-900">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-2xl sm:text-3xl text-realm-gold-400 mb-4"
          >
            Roleplay Built In, Not Bolted On
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-sm text-realm-text-secondary leading-relaxed mb-6"
          >
            Most browser games treat social and creative tools as an afterthought. We made them a pillar. A dice roller backed by real character stats. Narrator tools that feel like a GM screen. Forum roleplay where your character sheet carries the weight of every battle, every election, every betrayal.
          </motion.p>

          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-xs text-realm-text-muted italic"
          >
            The character sheet isn&apos;t a spreadsheet. It&apos;s a document that exists in the world.
          </motion.p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* EMAIL CAPTURE — FULL ATMOSPHERIC                                  */}
      {/* ================================================================= */}
      <section className="py-14 sm:py-16 px-6 relative bg-realm-bg-800">
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(138, 80, 200, 0.05) 0%, transparent 70%)' }}
        />

        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-xl mx-auto text-center relative z-10"
        >
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl text-realm-gold-400 mb-4"
            style={{ textShadow: '0 0 30px rgba(212, 168, 67, 0.25)' }}
          >
            The Gates Will Open Soon
          </h2>
          <p className="text-realm-text-secondary text-sm sm:text-base mb-8 leading-relaxed">
            Leave word with the ravens. When the gates of Aethermere open, you&apos;ll be the first to know.
          </p>

          {/* TODO: Wire Kit (ConvertKit) form action URL here. */}
          {bottomSubmitted ? (
            <div className="py-4">
              <p className="font-display text-realm-gold-400 text-base">The raven flies.</p>
              <p className="text-realm-text-muted text-xs mt-2">Watch the skies. Word will come.</p>
            </div>
          ) : (
            <form onSubmit={handleBottomSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <RealmInput
                type="email"
                placeholder="Your email address"
                value={bottomEmail}
                onChange={(e) => setBottomEmail(e.target.value)}
                required
                className="flex-1"
              />
              <RealmButton type="submit" variant="primary" size="lg" className="shrink-0 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Send a Raven
              </RealmButton>
            </form>
          )}

          <p className="text-realm-text-muted text-[11px] mt-4">
            Already have access?{' '}
            <button onClick={() => navigate('/login')} className="text-realm-gold-400/70 hover:text-realm-gold-400 transition-colors underline underline-offset-2">
              Sign in
            </button>
          </p>

          <p className="text-realm-text-muted/60 text-[11px] mt-6">
            Free to play. No downloads. Just a browser and fifteen minutes.
          </p>
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* FOOTER                                                            */}
      {/* ================================================================= */}
      <footer className="py-6 px-6 border-t border-realm-border bg-realm-bg-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-display text-realm-gold-400 tracking-wider text-sm">
            Realm of Crowns
          </span>
          <nav className="flex items-center gap-6 text-xs text-realm-text-muted">
            <a
              href="https://babecreststudios.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-realm-gold-400 transition-colors"
            >
              A Babe Crest Studios game
            </a>
            <a
              href="https://x.com/RealmOfCrowns"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-realm-gold-400 transition-colors"
            >
              {'\uD835\uDD4F'} @RealmOfCrowns
            </a>
          </nav>
          <span className="text-[11px] text-realm-text-muted">
            &copy; {new Date().getFullYear()} Babe Crest Studios
          </span>
        </div>
      </footer>

      {/* Keyframe for ambient pulse */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
