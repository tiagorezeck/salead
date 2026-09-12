// src/modules/landing-pages/components/TrackingPanel.tsx

import { useMemo, useState } from "react";
import { Copy, Check, Radio, Plus, ExternalLink, BarChart3, Eye } from "lucide-react";
import {
  DEFAULT_CHANNELS,
  buildTrackingUrl,
  getLPModule,
  type Channel,
  type LP,
  type LPStats,
} from "@/modules/landing-pages";
import { toast } from "sonner";

export function TrackingPanel({ lp }: { lp: Partial<LP> & { id: string; name?: string; slug?: string } }) {
  const effectiveSlug = lp.slug || lp.id;
  const [campaign, setCampaign] = useState(effectiveSlug);
  const [content, setContent] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [selected, setSelected] = useState<string[]>([
    "instagram-bio",
    "instagram-story",
    "facebook",
    "whatsapp",
    "email",
  ]);
  const [customChannels, setCustomChannels] = useState<Channel[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  const allChannels = [...DEFAULT_CHANNELS, ...customChannels];
  const chosen = allChannels.filter((c) => selected.includes(c.id));

  const [statsTick, setStatsTick] = useState(0);
  const stats: LPStats = useMemo(
    () => getLPModule().analytics.getStats(lp.id),
    [lp.id, statsTick],
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function addCustom() {
    if (!customLabel.trim()) return;
    const id = `custom-${customLabel.toLowerCase().replace(/\s+/g, "-")}`;
    const ch: Channel = {
      id,
      label: customLabel,
      utm_source: id,
      utm_medium: "custom",
      color: "#FF6A00",
      group: "own",
    };
    setCustomChannels((cs) => [...cs, ch]);
    setSelected((s) => [...s, id]);
    setCustomLabel("");
    toast.success(`Canal "${customLabel}" adicionado!`);
  }

  const generatedUrls = useMemo(() => {
    return chosen.map((c) => ({
      channel: c,
      url: buildTrackingUrl({
        slug: effectiveSlug,
        channel: c,
        campaign: campaign || undefined,
        content: content || undefined,
      }),
    }));
  }, [chosen, effectiveSlug, campaign, content]);

  function copyAllLinks() {
    const text = generatedUrls.map((item) => `${item.channel.label}: ${item.url}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("Todos os links foram copiados!");
  }

  return (
    <div className="space-y-4 animate-in fade-in text-xs text-white">
      {/* Botões do Topo */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/lp/${effectiveSlug}`}
          target="_blank"
          rel="noreferrer"
          className="h-8.5 rounded-xl border border-white/10 bg-[#181B22] hover:bg-white/10 text-xs font-semibold text-white/90 flex items-center justify-center gap-1.5 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5 text-[#FF6A00]" /> Abrir LP pública
        </a>
        <a
          href={`/lp/${effectiveSlug}?preview=true`}
          target="_blank"
          rel="noreferrer"
          className="h-8.5 rounded-xl border border-white/10 bg-[#181B22] hover:bg-white/10 text-xs font-semibold text-white/90 flex items-center justify-center gap-1.5 transition-all"
        >
          <Eye className="h-3.5 w-3.5 text-[#FF6A00]" /> Preview privado
        </a>
      </div>

      {/* Campanha & Variação */}
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">CAMPANHA</label>
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="ex: lancamento-abril"
            className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
          />
        </div>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Conteúdo / variação (opcional) — ex: banner-a"
          className="w-full bg-[#181B22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
        />
      </div>

      {/* Seletor de Canais */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-[#FF6A00]" /> CANAIS
          </label>
          <span className="text-[10px] text-white/50">{chosen.length} selecionados</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {allChannels.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`text-left text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  on ? "border-[#FF6A00]/50 bg-[#FF6A00]/10 text-white" : "border-white/10 bg-[#181B22] text-white/60 hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="truncate flex-1 text-[11px] font-medium">{c.label}</span>
                {on && <Check className="h-3 w-3 text-[#FF6A00] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Input para canal customizado */}
        <div className="flex gap-1.5 pt-1">
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="+ Canal custom (ex: influencer-fulano)"
            className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF6A00]"
          />
          <button
            type="button"
            onClick={addCustom}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Links por Canal */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <label className="text-[10px] font-black text-white/60 uppercase tracking-widest">LINKS POR CANAL</label>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {generatedUrls.map(({ channel, url }) => (
            <TrackingLinkRow key={channel.id} channel={channel} url={url} />
          ))}
        </div>

        {/* Botão Copiar Todos os Links */}
        <button
          type="button"
          onClick={copyAllLinks}
          className="w-full py-2.5 rounded-xl border border-white/10 bg-[#181B22] hover:bg-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {copiedAll ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>Copiar todos os links</span>
        </button>
      </div>

      {/* Card Origem dos Leads */}
      <div className="rounded-2xl border border-white/10 bg-[#181B22] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-[#FF6A00]" /> ORIGEM DOS LEADS
          </div>
          <button
            type="button"
            onClick={() => {
              setStatsTick((v) => v + 1);
              toast.info("Métricas atualizadas!");
            }}
            className="text-[10px] text-white/40 hover:text-white cursor-pointer"
          >
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#121418] p-2.5 text-center border border-white/5">
            <div className="text-base font-black text-white">{stats.visits || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mt-0.5">VISITAS</div>
          </div>
          <div className="rounded-xl bg-[#121418] p-2.5 text-center border border-white/5">
            <div className="text-base font-black text-white">{stats.leads || 0}</div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mt-0.5">LEADS</div>
          </div>
          <div className="rounded-xl bg-[#121418] p-2.5 text-center border border-white/5">
            <div className="text-base font-black text-white">{stats.conv || 0}%</div>
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mt-0.5">CONV.</div>
          </div>
        </div>

        <p className="text-[10px] text-white/40 text-center">
          Ainda sem visitas. Compartilhe os links acima para começar a coletar dados.
        </p>
      </div>
    </div>
  );
}

function TrackingLinkRow({ channel, url }: { channel: Channel; url: string }) {
  const [copied, setCopied] = useState(false);
  const groupLabel = (channel.group || "social").toUpperCase();

  return (
    <div className="rounded-xl border border-white/10 bg-[#181B22] p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: channel.color }} />
          <span className="text-xs font-semibold text-white truncate">{channel.label}</span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-white/40 px-1.5 py-0.5 rounded bg-white/5">
          {groupLabel}
        </span>
      </div>

      <div className="flex gap-1.5">
        <input
          readOnly
          value={url}
          className="flex-1 bg-[#121418] border border-white/5 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white/70 truncate focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            toast.success(`Link de "${channel.label}" copiado!`);
          }}
          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white shrink-0 cursor-pointer"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
