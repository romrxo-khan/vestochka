import { TARIFFS, priceLabel, type Plan } from '@/lib/tariffs'

/**
 * Карточки тарифов. На лендинге — обзорно (обе валюты, без кнопок). В окне оплаты —
 * валюта по выбранной карте + кнопка «Выбрать» (onPick задаёт план для checkout).
 */
export default function Tariffs({
  currency,
  onPick,
  busy,
}: {
  /** 'rub' | 'usd' — одна валюта; 'both' — показать обе (для лендинга). */
  currency: 'rub' | 'usd' | 'both'
  onPick?: (plan: Plan) => void
  busy?: boolean
}) {
  return (
    <div className="tariffs">
      {TARIFFS.map((t) => (
        <div key={t.id} className={`tariff${t.highlight ? ' tariff-hl' : ''}`}>
          <div className="tariff-name">{t.name}</div>
          <div className="tariff-price">
            {currency === 'both' ? (
              <>
                {t.rub} ₽<span className="tariff-per">/мес</span>
                <span className="tariff-alt"> · ${t.usd.toFixed(2)}/мес</span>
              </>
            ) : (
              priceLabel(t, currency)
            )}
          </div>
          <div className="tariff-tag">{t.tagline}</div>
          <ul className="tariff-feats">
            {t.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          {onPick && (
            <button
              type="button"
              className="pay-btn"
              onClick={() => onPick(t.id)}
              disabled={busy}
            >
              <span className="pay-btn-title">
                {busy ? 'Открываем оплату…' : `Выбрать «${t.name}»`}
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
