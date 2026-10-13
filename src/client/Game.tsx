import { useMemo, useState } from 'react';
import {
  ACTION_SPACES,
  BUILDINGS,
  CONTRACTS,
  HIRE_COST,
  LOAN_AMOUNT,
  MARKET_UNITS_PER_ACTION,
  MATERIALS,
  MATERIAL_INFO,
  MAX_CONTRACTS_IN_HAND,
  NEWS,
  ROUNDS,
  TERRAIN_INFO,
  type ActionSpaceId,
  type Material,
} from '../engine/data.ts';
import {
  buildOptions,
  buildSpace,
  emptyMaterials,
  formatCost,
  getLot,
  incomePreview,
  lotPrice,
  marketQuote,
  productionOf,
  rentOf,
  spaceCapacity,
  spaceFree,
  turnOrder,
} from '../engine/rules.ts';
import type { Action, GameView, Lot, Materials, Player, TradeBundle } from '../engine/types.ts';
import { net } from './net.ts';
import { RulesModal } from './Rules.tsx';

type Act = (a: Action) => void;

const TERRAIN_CLASS: Record<Lot['terrain'], string> = { Z: 'tz', L: 'tl', G: 'tg', P: 'tp', C: 'tc' };

function playerOf(view: GameView, id: string | null | undefined): Player | undefined {
  return view.players.find((p) => p.id === id);
}

function buildingLabel(lot: Lot): { icon: string; name: string } | null {
  const b = lot.building;
  if (!b) return null;
  if (b.type === 'public') {
    const c = CONTRACTS[b.contractId!];
    return { icon: c.icon, name: c.name };
  }
  return { icon: BUILDINGS[b.type].icon, name: BUILDINGS[b.type].name };
}

function isStartLot(lot: Lot) {
  return !lot.owner && lot.auctionNo === null && ['Z', 'L', 'G'].includes(lot.terrain);
}

export function Game({ view }: { view: GameView }) {
  const act: Act = (action) => net.send({ t: 'action', action });
  const [selected, setSelected] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const me = playerOf(view, view.me)!;
  const myTurn = view.currentPlayer === view.me;
  const current = playerOf(view, view.currentPlayer);

  let status: string;
  if (view.phase === 'setup') status = myTurn ? 'Wybierz działkę startową na planszy' : `${current?.name} wybiera działkę startową`;
  else if (view.phase === 'auction') status = 'Licytacja!';
  else if (view.phase === 'actions')
    status = myTurn ? `Twoja tura — masz ${me.managersLeft} menedżerów` : `Tura: ${current?.bot ? '🤖 ' : ''}${current?.name}${current?.bot ? ' (myśli…)' : ''}`;
  else status = 'Koniec gry';

  return (
    <div className="game">
      <header className={`topbar ${myTurn ? 'my-turn' : ''}`}>
        <div>
          <strong>🏙️ Runda {Math.max(view.round, 1)}/{ROUNDS}</strong>
          <span className="status">{status}</span>
          <div className="topbar-res">
            💰{me.money} 🪵{me.materials.wood} 🧱{me.materials.brick} 🔩{me.materials.steel} ⭐{me.prestige} · 👔{me.managersLeft}/{me.managers}
          </div>
        </div>
        <div className="topbar-links">
          <button className="link" onClick={() => setRules(true)}>
            📖 Zasady
          </button>
          <LeaveButton view={view} />
        </div>
      </header>
      {rules && <RulesModal onClose={() => setRules(false)} />}

      {view.phase === 'gameOver' && <Scores view={view} />}
      {view.phase === 'auction' && <Auction view={view} act={act} />}

      <div className="layout">
        <div className="col-main">
          <News view={view} />
          <Board view={view} selected={selected} onSelect={setSelected} />
          {selected && <LotPanel view={view} lotId={selected} act={act} onClose={() => setSelected(null)} />}
          {view.phase === 'actions' && <ActionBoard view={view} act={act} />}
          <ContractsPanel view={view} act={act} />
        </div>
        <div className="col-side">
          <MyPanel view={view} />
          <Market view={view} />
          <Players view={view} />
          {view.phase === 'actions' && <Trades view={view} act={act} />}
          <Log view={view} />
        </div>
      </div>
    </div>
  );
}

function LeaveButton({ view }: { view: GameView }) {
  const isHost = net.state.host === view.me;
  const over = view.phase === 'gameOver';
  if (!isHost && !over) return null;
  const question = isHost
    ? over
      ? 'Zamknąć pokój? Wszyscy wrócą do ekranu startowego.'
      : 'Jesteś gospodarzem — wyjście zakończy grę dla wszystkich. Na pewno?'
    : 'Wyjść do ekranu startowego?';
  return (
    <button className="link" onClick={() => confirm(question) && net.leave()}>
      {isHost ? (over ? 'Nowa gra' : 'Zakończ') : 'Wyjdź'}
    </button>
  );
}

function News({ view }: { view: GameView }) {
  if (!view.currentNews) return null;
  const n = NEWS[view.currentNews];
  return (
    <section className="panel news">
      <div className="news-now">
        <span className="tag">📰 Teraz</span>
        <strong>{n.name}</strong> — {n.text}
      </div>
      {view.newsPreview.length > 0 && (
        <div className="news-next">
          {view.newsPreview.map((id, i) => (
            <span key={id} title={NEWS[id].text}>
              Runda {view.round + i + 1}: <strong>{NEWS[id].name}</strong> — {NEWS[id].text}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Board({ view, selected, onSelect }: { view: GameView; selected: string | null; onSelect: (id: string) => void }) {
  const pickable = view.phase === 'setup' && view.currentPlayer === view.me;
  return (
    <section className="board-wrap">
      <div className="board">
        <span />
        {'ABCDEF'.split('').map((c) => (
          <span key={c} className="axis">
            {c}
          </span>
        ))}
        {[0, 1, 2, 3, 4, 5].map((y) => (
          <Row key={y} y={y} view={view} selected={selected} onSelect={onSelect} pickable={pickable} />
        ))}
      </div>
      <div className="legend">
        {(['Z', 'L', 'G', 'P', 'C'] as const).map((t) => (
          <span key={t}>
            <i className={TERRAIN_CLASS[t]} /> {TERRAIN_INFO[t].name}
          </span>
        ))}
        <span>🔨 licytacja</span>
      </div>
    </section>
  );
}

function Row(props: { y: number; view: GameView; selected: string | null; onSelect: (id: string) => void; pickable: boolean }) {
  const { y, view, selected, onSelect, pickable } = props;
  return (
    <>
      <span className="axis">{y + 1}</span>
      {view.lots
        .filter((l) => l.y === y)
        .map((lot) => {
          const owner = playerOf(view, lot.owner);
          const b = buildingLabel(lot);
          const rent = rentOf(view, lot);
          const prod = productionOf(view, lot);
          const yieldText = rent ? `+${rent}💰` : MATERIALS.filter((m) => prod[m]).map((m) => `+${prod[m]}${MATERIAL_INFO[m].icon}`).join('');
          const highlight = pickable && isStartLot(lot);
          const upcomingAuction = !lot.owner && lot.auctionNo !== null && !lot.auctionUnsold;
          return (
            <button
              key={lot.id}
              className={`lot ${TERRAIN_CLASS[lot.terrain]} ${selected === lot.id ? 'selected' : ''} ${highlight ? 'pickable' : ''} ${view.auctionLot === lot.id ? 'auctioned' : ''}`}
              style={owner ? { boxShadow: `inset 0 0 0 4px ${owner.color}` } : undefined}
              onClick={() => onSelect(lot.id)}
              title={`${lot.id} · ${TERRAIN_INFO[lot.terrain].name}${owner ? ` · ${owner.name}` : ''}${b ? ` · ${b.name}` : ''}`}
            >
              <span className="lot-id">{lot.id}</span>
              {upcomingAuction && <span className="lot-auction">🔨{lot.auctionNo}</span>}
              {lot.auctionUnsold && !lot.owner && <span className="lot-auction">6💰</span>}
              {b && <span className="lot-building">{b.icon}</span>}
              {yieldText && <span className="lot-yield">{yieldText}</span>}
            </button>
          );
        })}
    </>
  );
}

function LotPanel({ view, lotId, act, onClose }: { view: GameView; lotId: string; act: Act; onClose: () => void }) {
  const lot = getLot(view, lotId)!;
  const me = view.me;
  const myTurn = view.currentPlayer === me;
  const owner = playerOf(view, lot.owner);
  const b = buildingLabel(lot);
  const canAct = view.phase === 'actions' && myTurn;
  const price = lotPrice(view, lot);
  const slot = buildSpace(view);
  const options = lot.owner === me ? buildOptions(view, me, lot.id, slot?.extra ?? 0) : [];
  const rent = rentOf(view, lot);

  return (
    <section className="panel lot-panel">
      <button className="close" onClick={onClose} aria-label="Zamknij">
        ✕
      </button>
      <h3>
        Działka {lot.id} · {TERRAIN_INFO[lot.terrain].name}
      </h3>
      <p>
        {owner ? (
          <>
            Właściciel: <span className="dot" style={{ background: owner.color }} /> {owner.name}
          </>
        ) : lot.auctionNo !== null && !lot.auctionUnsold ? (
          `Działka licytowana w rundzie ${lot.auctionNo}.`
        ) : (
          'Wolna działka.'
        )}
        {b && (
          <>
            {' '}
            · {b.icon} {b.name}
            {rent > 0 && ` · czynsz ${rent} 💰/rundę`}
          </>
        )}
      </p>

      {view.phase === 'setup' && myTurn && isStartLot(lot) && (
        <button className="primary" onClick={() => act({ type: 'pickStartLot', lotId: lot.id })}>
          Wybierz jako działkę startową
        </button>
      )}

      {canAct && !lot.owner && price !== null && (
        <button
          className="primary"
          disabled={!spaceFree(view, 'buyLot') || playerOf(view, me)!.money < price}
          onClick={() => act({ type: 'buyLot', lotId: lot.id })}
        >
          Kup działkę za {price} 💰 {!spaceFree(view, 'buyLot') && '(pole zajęte)'}
        </button>
      )}

      {lot.owner === me && options.length > 0 && (
        <div className="build-options">
          <h4>
            Buduj {slot?.extra ? '(drugie pole Buduj: +1 💰)' : ''} {!slot && view.phase === 'actions' && '— pola Buduj zajęte'}
          </h4>
          {options.map((o) => (
            <button
              key={o.building + (o.contractId ?? '')}
              disabled={!canAct || !slot || !o.ok}
              onClick={() => act({ type: 'build', lotId: lot.id, building: o.building, contractId: o.contractId })}
            >
              <span className="opt-icon">{o.icon}</span>
              <span className="opt-name">{o.label}</span>
              <span className="opt-cost">{formatCost(o.cost)}</span>
            </button>
          ))}
          {!canAct && view.phase === 'actions' && <p className="hint">Budować możesz w swojej turze.</p>}
        </div>
      )}
    </section>
  );
}

function SpaceDots({ view, id }: { view: GameView; id: ActionSpaceId }) {
  const cap = spaceCapacity(view, id);
  const taken = view.actionSpaces[id];
  const slots = cap === Infinity ? taken.length + 1 : cap;
  return (
    <span className="slots">
      {Array.from({ length: slots }, (_, i) => {
        const p = playerOf(view, taken[i]);
        return <span key={i} className={`slot ${p ? 'taken' : ''}`} style={p ? { background: p.color } : undefined} />;
      })}
    </span>
  );
}

function ActionBoard({ view, act }: { view: GameView; act: Act }) {
  const me = playerOf(view, view.me)!;
  const myTurn = view.currentPlayer === view.me;
  return (
    <section className="panel">
      <h3>Pola akcji {myTurn && <span className="badge">Twoja tura</span>}</h3>
      <div className="spaces">
        {ACTION_SPACES.map((s) => {
          const free = spaceFree(view, s.id);
          const enabled = myTurn && free;
          return (
            <div key={s.id} className={`space ${free ? '' : 'full'}`}>
              <div className="space-head">
                <strong>{s.name}</strong>
                <SpaceDots view={view} id={s.id} />
              </div>
              <div className="space-text">{s.text}</div>
              <SpaceControls id={s.id} view={view} me={me} enabled={enabled} act={act} />
            </div>
          );
        })}
      </div>
      {myTurn && (
        <button className="link" onClick={() => confirm('Spasować do końca rundy? Pozostali menedżerowie nie wykonają akcji.') && act({ type: 'pass' })}>
          Pasuję do końca rundy
        </button>
      )}
    </section>
  );
}

function SpaceControls({ id, view, me, enabled, act }: { id: ActionSpaceId; view: GameView; me: Player; enabled: boolean; act: Act }) {
  switch (id) {
    case 'buyLot':
    case 'build':
    case 'build2':
      return enabled ? <div className="hint">Kliknij działkę na planszy.</div> : null;
    case 'sell':
    case 'buy':
      return enabled ? <MarketForm side={id} view={view} me={me} act={act} /> : null;
    case 'townhall':
      return enabled ? <div className="hint">Wybierz zlecenie poniżej planszy.</div> : null;
    case 'bank':
      return (
        <div className="row">
          <button disabled={!enabled} onClick={() => act({ type: 'loan' })}>
            Pożycz {LOAN_AMOUNT}
          </button>
          <button disabled={!enabled || me.loans === 0 || me.money < LOAN_AMOUNT} onClick={() => act({ type: 'repay' })}>
            Spłać {LOAN_AMOUNT}
          </button>
        </div>
      );
    case 'hire':
      return (
        <button disabled={!enabled || me.hired || me.money < HIRE_COST} onClick={() => act({ type: 'hire' })}>
          {me.hired ? 'Już zatrudniony' : `Zatrudnij za ${HIRE_COST}`}
        </button>
      );
    case 'firstPlayer':
      return (
        <button disabled={!enabled} onClick={() => act({ type: 'takeFirstPlayer' })}>
          Weź znacznik
        </button>
      );
  }
}

function MarketForm({ side, view, me, act }: { side: 'sell' | 'buy'; view: GameView; me: Player; act: Act }) {
  const [amounts, setAmounts] = useState<Materials>(emptyMaterials);
  const units = MATERIALS.reduce((s, m) => s + amounts[m], 0);
  const quote = marketQuote(view.prices, amounts, side);
  const tooExpensive = side === 'buy' && quote.total > me.money;
  return (
    <div className="market-form">
      {MATERIALS.map((m) => (
        <Stepper
          key={m}
          label={`${MATERIAL_INFO[m].icon}`}
          value={amounts[m]}
          max={side === 'sell' ? me.materials[m] : MARKET_UNITS_PER_ACTION}
          canInc={units < MARKET_UNITS_PER_ACTION}
          onChange={(v) => setAmounts({ ...amounts, [m]: v })}
        />
      ))}
      <button
        className="primary"
        disabled={units === 0 || tooExpensive}
        onClick={() => {
          act({ type: side, amounts });
          setAmounts(emptyMaterials());
        }}
      >
        {side === 'sell' ? `Sprzedaj za ${quote.total}` : `Kup za ${quote.total}`} 💰
      </button>
    </div>
  );
}

function Stepper(props: { label: string; value: number; max: number; canInc?: boolean; onChange: (v: number) => void }) {
  const { label, value, max, canInc = true, onChange } = props;
  return (
    <span className="stepper">
      <span className="stepper-label">{label}</span>
      <button disabled={value <= 0} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="stepper-value">{value}</span>
      <button disabled={value >= max || !canInc} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

function ContractsPanel({ view, act }: { view: GameView; act: Act }) {
  const me = playerOf(view, view.me)!;
  const canTake = view.phase === 'actions' && view.currentPlayer === view.me && spaceFree(view, 'townhall') && me.contracts.length < MAX_CONTRACTS_IN_HAND;
  return (
    <section className="panel">
      <h3>
        Zlecenia miasta <small>(w talii: {view.contractDeckCount})</small>
      </h3>
      <div className="contracts">
        {view.openContracts.map((id) => (
          <ContractCard key={id} id={id}>
            {view.phase === 'actions' && (
              <button disabled={!canTake} onClick={() => act({ type: 'takeContract', contractId: id })}>
                Weź (Ratusz)
              </button>
            )}
          </ContractCard>
        ))}
      </div>
      <p className="hint">Zlecenie realizujesz akcją Buduj na swojej działce. Budynek publiczny daje +1 czynszu sąsiednim mieszkaniom.</p>
    </section>
  );
}

function ContractCard({ id, children }: { id: string; children?: React.ReactNode }) {
  const c = CONTRACTS[id];
  return (
    <div className="contract">
      <div className="contract-title">
        {c.icon} <strong>{c.name}</strong>
      </div>
      <div>Teren: {c.terrains.map((t) => TERRAIN_INFO[t].name).join(' / ')}</div>
      <div>Koszt: {formatCost(c.cost)}</div>
      <div>
        Nagroda: {c.rewardMoney} 💰 + {c.rewardPrestige} PP
      </div>
      {children}
    </div>
  );
}

function MyPanel({ view }: { view: GameView }) {
  const me = playerOf(view, view.me)!;
  const income = incomePreview(view, me.id);
  const incomeParts = [`${income.money} 💰`, ...MATERIALS.filter((m) => income.materials[m]).map((m) => `${income.materials[m]} ${MATERIAL_INFO[m].icon}`)];
  return (
    <section className="panel me" style={{ borderColor: me.color }}>
      <h3>
        <span className="dot" style={{ background: me.color }} /> {me.name}
      </h3>
      <div className="resources">
        <span className="res">💰 {me.money}</span>
        {MATERIALS.map((m) => (
          <span key={m} className="res" title={MATERIAL_INFO[m].name}>
            {MATERIAL_INFO[m].icon} {me.materials[m]}
          </span>
        ))}
        <span className="res" title="Prestiż">
          ⭐ {me.prestige}
        </span>
      </div>
      <div className="small">
        Menedżerowie: {me.managersLeft}/{me.managers} · Pożyczki: {me.loans} · Dochód na koniec rundy: {incomeParts.join(', ')}
      </div>
      {me.contracts.length > 0 && (
        <div className="contracts mine">
          {me.contracts.map((id) => (
            <ContractCard key={id} id={id} />
          ))}
        </div>
      )}
    </section>
  );
}

function Market({ view }: { view: GameView }) {
  return (
    <section className="panel">
      <h3>Rynek</h3>
      <div className="market">
        {MATERIALS.map((m: Material) => {
          const price = view.prices[m];
          const base = MATERIAL_INFO[m].basePrice;
          return (
            <div key={m} className="price">
              <span className="price-icon">{MATERIAL_INFO[m].icon}</span>
              <span>{MATERIAL_INFO[m].name}</span>
              <strong>{price} 💰</strong>
              <small>{price > base ? '▲' : price < base ? '▼' : '='} baza {base}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Players({ view }: { view: GameView }) {
  const order = turnOrder(view);
  const nextFirst = view.nextFirstPlayer !== null ? view.players[view.nextFirstPlayer] : null;
  return (
    <section className="panel">
      <h3>Gracze</h3>
      {order.map((pid, i) => {
        const p = playerOf(view, pid)!;
        const lots = view.lots.filter((l) => l.owner === pid).length;
        return (
          <div key={pid} className={`player-row ${view.currentPlayer === pid ? 'active' : ''}`}>
            <span className="dot" style={{ background: p.color }} />
            <strong>
              {p.bot && '🤖 '}
              {p.name}
            </strong>
            {i === 0 && <span title="Pierwszy gracz"> 🥇</span>}
            {nextFirst?.id === pid && <span title="Zacznie następną rundę"> ⏭️</span>}
            {!p.connected && !p.bot && <span title="Rozłączony"> 📵</span>}
            <span className="player-stats">
              💰{p.money} 🪵{p.materials.wood} 🧱{p.materials.brick} 🔩{p.materials.steel} ⭐{p.prestige} · 🗺️{lots} · 👔{p.managersLeft}/{p.managers}
              {p.loans > 0 && ` · 🏦${p.loans}`}
              {p.contracts.length > 0 && ` · 📜${p.contracts.length}`}
            </span>
          </div>
        );
      })}
    </section>
  );
}

const emptyBundle = (): TradeBundle => ({ money: 0, ...emptyMaterials() });

function bundleText(b: TradeBundle): string {
  const parts = [b.money ? `${b.money} 💰` : '', ...MATERIALS.map((m) => (b[m] ? `${b[m]} ${MATERIAL_INFO[m].icon}` : ''))].filter(Boolean);
  return parts.join(', ') || 'nic';
}

function Trades({ view, act }: { view: GameView; act: Act }) {
  const me = playerOf(view, view.me)!;
  const others = view.players.filter((p) => p.id !== me.id);
  const [to, setTo] = useState(others[0]?.id ?? '');
  const [give, setGive] = useState<TradeBundle>(emptyBundle);
  const [get, setGet] = useState<TradeBundle>(emptyBundle);
  const [open, setOpen] = useState(false);
  const incoming = view.trades.filter((t) => t.to === me.id);
  const outgoing = view.trades.filter((t) => t.from === me.id);
  const target = playerOf(view, to);

  const bundleEditor = (b: TradeBundle, set: (b: TradeBundle) => void, owner: Player | undefined) => (
    <div className="bundle">
      <Stepper label="💰" value={b.money} max={owner?.money ?? 0} onChange={(v) => set({ ...b, money: v })} />
      {MATERIALS.map((m) => (
        <Stepper key={m} label={MATERIAL_INFO[m].icon} value={b[m]} max={owner?.materials[m] ?? 0} onChange={(v) => set({ ...b, [m]: v })} />
      ))}
    </div>
  );

  return (
    <section className="panel">
      <h3>Handel 🤝</h3>
      {incoming.map((t) => (
        <div key={t.id} className="trade incoming">
          <strong>{playerOf(view, t.from)?.name}</strong> daje {bundleText(t.give)} za {bundleText(t.get)}
          <div className="row">
            <button className="primary" onClick={() => act({ type: 'respondTrade', tradeId: t.id, accept: true })}>
              Przyjmij
            </button>
            <button onClick={() => act({ type: 'respondTrade', tradeId: t.id, accept: false })}>Odrzuć</button>
          </div>
        </div>
      ))}
      {outgoing.map((t) => (
        <div key={t.id} className="trade">
          Do {playerOf(view, t.to)?.name}: dajesz {bundleText(t.give)} za {bundleText(t.get)}
          <button className="link" onClick={() => act({ type: 'cancelTrade', tradeId: t.id })}>
            Wycofaj
          </button>
        </div>
      ))}
      {!open ? (
        <button onClick={() => setOpen(true)}>Zaproponuj wymianę</button>
      ) : (
        <div className="trade-form">
          <label>
            Z kim:{' '}
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div>Dajesz:</div>
          {bundleEditor(give, setGive, me)}
          <div>Chcesz dostać:</div>
          {bundleEditor(get, setGet, target)}
          <div className="row">
            <button
              className="primary"
              onClick={() => {
                act({ type: 'offerTrade', to, give, get });
                setGive(emptyBundle());
                setGet(emptyBundle());
                setOpen(false);
              }}
            >
              Wyślij ofertę
            </button>
            <button onClick={() => setOpen(false)}>Anuluj</button>
          </div>
        </div>
      )}
      <p className="hint">Handlować można w każdej chwili fazy akcji — nie zużywa to menedżera.</p>
    </section>
  );
}

function Auction({ view, act }: { view: GameView; act: Act }) {
  const me = playerOf(view, view.me)!;
  const lot = getLot(view, view.auctionLot!)!;
  const [bid, setBid] = useState(0);
  const submitted = view.myBid !== null;
  return (
    <section className="panel auction">
      <h3>
        🔨 Licytacja działki {lot.id} · {TERRAIN_INFO[lot.terrain].name}
      </h3>
      <p>Każdy w tajemnicy wpisuje ofertę. Oferty zostaną odkryte, gdy wszyscy zagłosują. Remis wygrywa gracz wcześniejszy w kolejności.</p>
      <div className="row">
        <Stepper label="💰" value={bid} max={me.money} onChange={setBid} />
        <button className="primary" onClick={() => act({ type: 'bid', amount: bid })}>
          {submitted ? `Zmień ofertę (teraz: ${view.myBid})` : 'Złóż ofertę'}
        </button>
      </div>
      <div className="small">
        Oferty złożyli:{' '}
        {view.players.map((p) => (
          <span key={p.id} className={view.bidders.includes(p.id) ? '' : 'muted'}>
            {view.bidders.includes(p.id) ? '✅' : '⏳'} {p.name}{' '}
          </span>
        ))}
      </div>
    </section>
  );
}

function Scores({ view }: { view: GameView }) {
  const rows = view.scores ?? [];
  return (
    <section className="panel scores">
      <h3>🏁 Koniec gry — wygrywa {playerOf(view, rows[0]?.playerId)?.name}!</h3>
      <table>
        <thead>
          <tr>
            <th>Gracz</th>
            <th>Gotówka</th>
            <th>Budynki</th>
            <th>Puste działki</th>
            <th>Prestiż</th>
            <th>Materiały</th>
            <th>Pożyczki</th>
            <th>Zlecenia</th>
            <th>Razem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = playerOf(view, r.playerId)!;
            return (
              <tr key={r.playerId}>
                <td>
                  <span className="dot" style={{ background: p.color }} /> {p.name}
                </td>
                <td>{r.money}</td>
                <td>{r.buildings}</td>
                <td>{r.emptyLots}</td>
                <td>{r.prestige}</td>
                <td>{r.materials}</td>
                <td>{r.loans}</td>
                <td>{r.contracts}</td>
                <td>
                  <strong>{r.total}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Log({ view }: { view: GameView }) {
  const entries = useMemo(() => [...view.log].reverse().slice(0, 40), [view.log]);
  return (
    <section className="panel log">
      <h3>Dziennik</h3>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>
            <small>R{e.round}</small> {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
