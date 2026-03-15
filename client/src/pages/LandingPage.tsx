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
    title: 'The Election',
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
// Race data
// ---------------------------------------------------------------------------
const CORE_RACES = [
  { name: 'Humans', desc: 'Empire builders of the Verdant Heartlands, ambitious to a fault and convinced the world was built for them.' },
  { name: 'Elves', desc: 'Ancient guardians of Silverwood who remember grudges older than most civilizations.' },
  { name: 'Dwarves', desc: 'Mountain-folk of Ironvault Deeps whose craftsmanship is legend and whose stubbornness is worse.' },
  { name: 'Orcs', desc: 'Honor-bound warriors of the Bloodstone Steppe, fierce in battle and first to keep their word.' },
  { name: 'Drakonid', desc: 'Scaled descendants of dragonkind from the Frozen Reaches, carrying storm and fire in their breath.' },
  { name: 'Nethkin', desc: 'Shadow-touched outcasts of Vel\u2019Naris, wielding dark gifts with the cunning of those who\u2019ve had to survive.' },
  { name: 'Harthfolk', desc: 'Cheerful traders of the Crossroads Freehold, welcome at every table and underestimated at every one.' },
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
            A medieval fantasy world that moves at the pace of life. Swords, spells, trade routes, and thrones &mdash; one action per day.
          </motion.p>

          {/* Identity line */}
          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-xs text-realm-text-muted mb-8 px-4 max-w-lg mx-auto tracking-wide uppercase"
          >
            A world to shape, a community to join, and a story to tell &mdash; all through one character
          </motion.p>

          {/* Email capture — compact inline */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="max-w-lg mx-auto">
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
                <RealmButton type="submit" variant="primary" size="lg" className="shrink-0 flex items-center gap-2">
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

        {/* Scroll indicator — slow opacity pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-10"
        >
          <ChevronDown className="w-6 h-6 text-realm-gold-400/50" style={{ animation: 'scroll-pulse 3s ease-in-out infinite' }} />
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* THREE PILLARS                                                     */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-16 px-6 relative bg-realm-bg-800">
        <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-realm-bg-900 to-transparent" />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-xl sm:text-2xl text-realm-gold-400 text-center mb-3"
          >
            Three Pillars. One Character.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* The Day's Work — game / mechanical */}
            <motion.div
              variants={cardFade}
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="border-t-2 border-realm-gold-600/30 pt-5 lg:border-r lg:border-r-realm-gold-600/10 lg:pr-8"
            >
              <h3 className="font-display text-lg text-realm-gold-400 mb-3">The Day&apos;s Work</h3>
              <p className="text-sm text-realm-text-secondary leading-relaxed mb-3">
                Smelt ore. Brew a potion. Travel dangerous roads where bandits and beasts test your steel. Elect mayors who can tax and betray. Build an economy where no one is self-sufficient and everyone depends on each other.
              </p>
              <p className="text-xs text-realm-text-muted italic">
                One action per day. The world moves whether you act or not &mdash; make yours count.
              </p>
            </motion.div>

            {/* The Town Square — social / community */}
            <motion.div
              variants={cardFade}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="border-t-2 border-realm-gold-600/30 pt-5 lg:border-r lg:border-r-realm-gold-600/10 lg:pr-8"
            >
              <h3 className="font-display text-lg text-realm-gold-400 mb-3">The Town Square</h3>
              <p className="text-sm text-realm-text-secondary leading-relaxed mb-3">
                Post a manifesto against the king&apos;s tariffs. Call out the mayor for raiding the treasury. Rally your guild to swing the vote. Spread a rumor that crashes the iron market. The boards aren&apos;t where you read the drama &mdash; they&apos;re where you make it.
              </p>
              <p className="text-xs text-realm-text-muted italic">
                The connective tissue that makes sixty-eight towns feel like one living world.
              </p>
            </motion.div>

            {/* The Tavern — roleplay / creative */}
            <motion.div
              variants={cardFade}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="border-t-2 border-realm-gold-600/30 pt-5"
            >
              <h3 className="font-display text-lg text-realm-gold-400 mb-3">The Tavern</h3>
              <p className="text-sm text-realm-text-secondary leading-relaxed mb-3">
                Open a thread in Aethermere&apos;s forums. Write your character into a scene &mdash; a moonlit negotiation, a duel in the ruins, a feast before the siege. When something contested happens, roll. Your real stats. Your real gear. The character sheet does the heavy lifting.
              </p>
              <p className="text-xs text-realm-text-muted italic">
                Play-by-post roleplay where your character isn&apos;t a fiction &mdash; it&apos;s a record of everything you&apos;ve earned.
              </p>
            </motion.div>
          </div>

          {/* Connector — pull quote */}
          <motion.div
            variants={fadeUp}
            custom={4}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="text-center mt-10"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 bg-realm-gold-600/25" />
              <div className="w-1.5 h-1.5 rotate-45 border border-realm-gold-500/40" />
              <div className="h-px w-12 bg-realm-gold-600/25" />
            </div>
            <p className="text-base sm:text-lg text-realm-text-secondary max-w-lg mx-auto leading-relaxed">
              The game builds the character. The boards build the community. The roleplay builds the story.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* DAILY-ACTION PITCH — editorial left-align                         */}
      {/* ================================================================= */}
      <section className="py-14 sm:py-20 px-6 relative bg-realm-bg-900">
        <div className="max-w-xl md:ml-[10%] lg:ml-[15%]">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-3xl sm:text-4xl text-realm-gold-400 text-center md:text-left mb-3"
          >
            Your Lunch Break. Fifteen Minutes.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="text-center md:text-left text-realm-text-muted text-xs uppercase tracking-wider mb-8"
          >
            Not a grind. A world that respects your time.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="space-y-4 text-sm text-realm-text-secondary leading-relaxed md:border-l-2 md:border-realm-gold-600/20 md:pl-6"
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
            className="text-center md:text-left text-xs text-realm-text-muted mt-8 italic"
          >
            One meaningful action. Real consequences. Then you come back tomorrow.
          </motion.p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* ATMOSPHERIC VIGNETTES                                             */}
      {/* ================================================================= */}
      <section
        className="py-12 sm:py-14 px-6 relative bg-realm-bg-800"
        style={{ background: 'radial-gradient(ellipse at center, rgba(77, 143, 168, 0.04) 0%, transparent 70%), var(--color-realm-bg-800)' }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-xl sm:text-2xl text-realm-gold-400 text-center mb-12"
          >
            A World With Teeth
          </motion.h2>

          <div className="space-y-12">
            {VIGNETTES.map((v, i) => (
              <motion.div
                key={v.title}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className={`flex items-start gap-5 ${i % 2 !== 0 ? 'md:flex-row-reverse md:text-right' : ''}`}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center mt-0.5">
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
      {/* ROLE ARCHETYPES                                                   */}
      {/* ================================================================= */}
      <section className="py-14 sm:py-16 px-6 relative bg-realm-bg-900">
        {/* Subtle purple glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(138, 80, 200, 0.05) 0%, transparent 60%)' }}
        />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-3xl sm:text-4xl text-realm-gold-400 mb-6"
          >
            What Will You Become?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="font-display text-xl sm:text-2xl text-realm-text-primary/90 leading-relaxed mb-6"
          >
            Forge a sword at dawn. Campaign for mayor by midday. Lead a prayer at the temple of Solarius before dusk. Rob a merchant on the road between towns. Brew a healing potion from herbs you gathered yesterday. Start a trade war that bankrupts a rival guild. Betray the council that elected you. Repent to a god who remembers everything.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12 bg-realm-gold-600/25" />
              <div className="w-1.5 h-1.5 rotate-45 border border-realm-gold-500/40" />
              <div className="h-px w-12 bg-realm-gold-600/25" />
            </div>
            <p className="text-sm text-realm-text-secondary leading-relaxed">
              Seven classes. Twenty-nine professions. Twelve gods. Elected kings and corrupt sheriffs. No character does it all &mdash; but yours will do things no one else can.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* RACES — THE PEOPLES OF AETHERMERE                                 */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-14 px-6 relative bg-realm-bg-800">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-xl sm:text-2xl text-realm-gold-400 text-center mb-3"
          >
            The Peoples of Aethermere
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center text-realm-text-muted text-xs uppercase tracking-wider mb-8"
          >
            Seven peoples at launch. Thirteen more awakening.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {CORE_RACES.map((race, i) => (
              <motion.div
                key={race.name}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                className="flex items-start gap-3 py-2"
              >
                <div className="w-px h-full min-h-[2rem] shrink-0 bg-realm-gold-600/25 mt-1" />
                <div>
                  <span className="font-display text-base text-realm-gold-400">{race.name}</span>
                  <p className="text-xs text-realm-text-secondary leading-relaxed mt-0.5">{race.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={fadeUp}
            custom={4}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-30px' }}
            className="text-center text-xs text-realm-text-muted mt-10 pt-6 border-t border-realm-gold-600/10 leading-relaxed max-w-xl mx-auto"
          >
            Thirteen more peoples stir at the edges of Aethermere &mdash; Half-Elves, Half-Orcs, Gnomes, Goliath, Beastfolk, Aasimar, Nightborne, Mosskin, Forgeborn, Elementari, Revenant, Changeling, and Kenku. Their stories are still being written.
          </motion.p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* COMMUNITY & RP — right-aligned editorial                          */}
      {/* ================================================================= */}
      <section
        className="py-10 sm:py-12 px-6 relative bg-realm-bg-900"
        style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(138, 80, 200, 0.03) 0%, transparent 60%), var(--color-realm-bg-900)' }}
      >
        <div className="max-w-xl md:mr-[10%] lg:mr-[15%] md:ml-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-2xl sm:text-3xl text-realm-gold-400 text-center md:text-left mb-4"
          >
            Roleplay Built In, Not Bolted On
          </motion.h2>

          <div className="md:border-r-2 md:border-realm-gold-600/20 md:pr-6 text-center md:text-left">
            <motion.p
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="text-sm text-realm-text-secondary leading-relaxed mb-4"
            >
              Grab a few friends. Open a thread. Write your characters into a scene. When something contested happens, roll &mdash; your actual stats, your actual gear, your actual level. No GM required. The character sheet does the heavy lifting of making it feel like a game rather than just collaborative fiction.
            </motion.p>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="text-sm text-realm-text-secondary leading-relaxed mb-4"
            >
              And when you want more structure, narrator tools give a GM everything they need &mdash; scene setup, contested rolls, NPC management. But freeform is the default. The barrier to entry is zero.
            </motion.p>

            <motion.p
              variants={fadeUp}
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="text-xs text-realm-text-muted italic"
            >
              Forum RP never touches game state. No one can write away what you&apos;ve earned. Your stats are real, your reputation is earned, and the sheet isn&apos;t a prop &mdash; it&apos;s proof.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* EMAIL CAPTURE — FULL ATMOSPHERIC                                  */}
      {/* ================================================================= */}
      <section className="py-16 sm:py-20 px-6 relative bg-realm-bg-800">
        {/* Ambient glow — strengthened */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(138, 80, 200, 0.08) 0%, transparent 70%)' }}
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
            style={{ textShadow: '0 0 40px rgba(212, 168, 67, 0.3)' }}
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
            <form onSubmit={handleBottomSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
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

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes scroll-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
