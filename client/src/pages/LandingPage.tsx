import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Crown,
  Swords,
  Pickaxe,
  Compass,
  ChevronDown,
  UserPlus,
  Route,
  Sparkles,
  Flame,
  Drama,
} from 'lucide-react';
import { RealmButton } from '../components/ui/RealmButton';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const CORE_RACES = [
  { name: 'Human', desc: 'Versatile settlers of the Verdant Heartlands, masters of adaptation and diplomacy.' },
  { name: 'Elf', desc: 'Ancient guardians of Silverwood, attuned to arcane magic and the rhythms of nature.' },
  { name: 'Dwarf', desc: 'Ironvault mountain-dwellers, peerless miners and legendary smiths.' },
  { name: 'Harthfolk', desc: 'Cheerful traders of the Crossroads, welcome in every tavern and marketplace.' },
  { name: 'Orc', desc: 'Fierce warriors of the Ashenfang Wastes, forged by fire and unyielding resolve.' },
  { name: 'Nethkin', desc: 'Shadow-touched outcasts of the Shadowmere Marshes, wielding dark gifts with cunning.' },
  { name: 'Drakonid', desc: 'Scaled descendants of dragonkind, commanding elemental power from the Frozen Reaches.' },
];

const FEATURES = [
  {
    title: 'Player-Driven Politics',
    desc: 'Elect mayors. Pass laws. Overthrow tyrants. Every town is governed by its players.',
    Icon: Crown,
  },
  {
    title: 'D&D-Style Combat',
    desc: 'Turn-based combat with class abilities, saving throws, and tactical depth inspired by tabletop RPGs.',
    Icon: Swords,
  },
  {
    title: 'Living Economy',
    desc: '29 professions. No character is self-sufficient. The blacksmith needs the miner who needs the merchant.',
    Icon: Pickaxe,
  },
  {
    title: 'Explore Aethermere',
    desc: 'Journey between towns through dangerous roads. Trade across regions. Discover a world that remembers.',
    Icon: Compass,
  },
  {
    title: 'Twelve Gods, Twelve Paths',
    desc: 'Choose a patron deity — or reject them all. Your faith shapes your alliances, your power, and your reputation.',
    Icon: Flame,
  },
  {
    title: 'Play Your Way',
    desc: 'Noble defender, cunning merchant, corrupt politician — or all three. No scripted heroes. The world doesn\'t judge. It remembers.',
    Icon: Drama,
  },
];

const DEPTH_ITEMS = [
  { label: 'Religion', text: 'Choose from 12 gods. Join a church. Elect a High Priest. Shape your town\'s spiritual identity.' },
  { label: 'Adventure', text: 'Road encounters, dangerous biomes, combat that plays out like a tabletop session.' },
  { label: 'Politics', text: 'Run for mayor. Pass laws. Tax citizens. Betray your allies when the time is right.' },
  { label: 'Trade', text: 'Caravans, market manipulation, supply chains across regions. The economy is yours to exploit.' },
  { label: 'Crafting', text: '29 professions that depend on each other. No grinding in isolation — cooperation is the path.' },
  { label: 'Morality', text: 'No good/evil alignment. No karma system. Just choices and a world that keeps score.' },
  { label: 'Community', text: 'Guilds, tavern chat, diplomacy between towns. The real game is the people you play with.' },
  { label: '7 Classes', text: 'Warrior, Mage, Rogue, Cleric, Ranger, Bard, Psion — each with unique ability trees.' },
];

const STEPS = [
  { Icon: UserPlus, label: 'Create a character', desc: 'Pick a race, class, and homeland.' },
  { Icon: Route, label: 'Choose your path', desc: 'Warrior, trader, politician — or all three.' },
  { Icon: Sparkles, label: 'Shape the realm', desc: 'Every action ripples through Aethermere.' },
];

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
// Component
// ---------------------------------------------------------------------------
export default function LandingPage() {
  const navigate = useNavigate();

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
            className="text-sm sm:text-base text-realm-text-secondary mb-8 px-4 max-w-xl mx-auto"
          >
            A free browser-based MMORPG. No downloads, no pay-to-win — just a world that reacts to every choice.
          </motion.p>

          {/* Key badges */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {['Free to Play', 'Browser-Based', 'No Downloads'].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 text-[11px] sm:text-xs font-medium uppercase tracking-widest text-realm-gold-400/80 border border-realm-gold-600/30 rounded-full bg-realm-gold-700/10"
              >
                {badge}
              </span>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col sm:flex-row gap-4 justify-center">
            <RealmButton variant="primary" size="lg" onClick={() => navigate('/register')}>
              Create Your Character
            </RealmButton>
            <RealmButton variant="secondary" size="lg" onClick={() => navigate('/login')}>
              Sign In
            </RealmButton>
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
      {/* FEATURES — 6 pillars                                              */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-14 px-6 relative bg-realm-bg-800">
        <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-realm-bg-900 to-transparent" />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-realm-gold-400 text-center mb-3"
          >
            Not Your Average MMO
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center text-realm-text-muted text-sm mb-8 max-w-lg mx-auto"
          >
            Six pillars that set Realm of Crowns apart.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="group border border-realm-border rounded-lg p-5 text-center bg-realm-bg-700
                           shadow-realm-panel
                           hover:border-realm-border-strong hover:shadow-realm-glow-strong
                           transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-realm-gold-600/20 bg-realm-gold-700/10 flex items-center justify-center group-hover:border-realm-gold-500/40 transition-colors duration-300">
                  <f.Icon className="w-6 h-6 text-realm-gold-400" />
                </div>
                <h3 className="font-display text-base text-realm-gold-400 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-realm-text-secondary leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* DEPTH — rapid-fire "and there's more"                             */}
      {/* ================================================================= */}
      <section className="py-10 sm:py-12 px-6 relative bg-realm-bg-900">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="font-display text-xl sm:text-2xl text-realm-gold-400 text-center mb-8"
          >
            A World With Layers
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {DEPTH_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                className="flex items-start gap-3 py-2"
              >
                <div className="w-px h-full min-h-[2rem] shrink-0 bg-realm-gold-600/25 mt-1" />
                <div>
                  <span className="font-display text-xs text-realm-gold-400 uppercase tracking-wider">{item.label}</span>
                  <p className="text-xs text-realm-text-secondary leading-relaxed mt-0.5">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* RACES                                                             */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-14 px-6 relative bg-realm-bg-800">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-2xl sm:text-3xl md:text-4xl text-realm-gold-400 text-center mb-3"
          >
            The Peoples of Aethermere
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center text-realm-text-secondary text-sm max-w-xl mx-auto mb-8"
          >
            Seven playable races at launch — thirteen more awakening as the realm grows.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CORE_RACES.map((race, i) => (
              <motion.div
                key={race.name}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="border border-realm-border rounded-lg p-4 bg-realm-bg-700
                           hover:border-realm-gold-600/30 hover:shadow-realm-glow
                           transition-all duration-300"
              >
                <h3 className="font-display text-base text-realm-gold-400 mb-1.5">
                  {race.name}
                </h3>
                <p className="text-xs text-realm-text-secondary leading-relaxed">
                  {race.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* HOW IT WORKS                                                      */}
      {/* ================================================================= */}
      <section className="py-8 sm:py-10 px-6 relative bg-realm-bg-900">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.h2
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="font-display text-2xl sm:text-3xl text-realm-gold-400 text-center mb-8"
          >
            Three Steps to Aethermere
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                custom={i}
                variants={cardFade}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="text-center"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full border border-realm-gold-600/25 bg-realm-bg-700 flex items-center justify-center">
                  <step.Icon className="w-6 h-6 text-realm-gold-400" />
                </div>
                <h3 className="font-display text-sm text-realm-text-primary mb-1">{step.label}</h3>
                <p className="text-xs text-realm-text-muted">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* FINAL CTA                                                         */}
      {/* ================================================================= */}
      <section className="py-12 sm:py-14 px-6 relative bg-realm-bg-800">
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
          className="max-w-2xl mx-auto text-center relative z-10"
        >
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl text-realm-gold-400 mb-4"
            style={{ textShadow: '0 0 30px rgba(212, 168, 67, 0.25)' }}
          >
            Your Story Begins Now
          </h2>
          <p className="text-realm-text-secondary text-sm sm:text-base mb-8">
            Free to play. Browser-based. No downloads. Just you and the realm.
          </p>
          <RealmButton variant="primary" size="lg" onClick={() => navigate('/register')}>
            Create Your Character
          </RealmButton>
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
          <nav className="flex gap-6 text-xs text-realm-text-muted">
            <a href="#" className="hover:text-realm-gold-400 transition-colors">About</a>
            <a href="#" className="hover:text-realm-gold-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-realm-gold-400 transition-colors">Privacy</a>
            <a
              href="https://babecreststudios.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-realm-gold-400 transition-colors"
            >
              A Babe Crest Studios game
            </a>
          </nav>
          <span className="text-[11px] text-realm-text-muted">
            &copy; {new Date().getFullYear()} Realm of Crowns
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
