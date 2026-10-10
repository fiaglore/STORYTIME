import { SHOP_ITEMS, type ShopItem } from "../content/shop";
import { ASSET_INCOME, ASSET_LABELS, describeItemPerks } from "../content/ownership";
import { SELL_RATE, type LifeCharacter } from "../engine/lifeSim";

interface Props {
  character: LifeCharacter;
  onSell: (item: ShopItem) => void;
}

// "My stuff": everything bought in the shop plus durable assets, with what
// each one does for you and a Sell button (see sellItem in lifeSim.ts).
export function Inventory({ character, onSell }: Props) {
  const owned = character.inventory
    .map((id) => SHOP_ITEMS.find((i) => i.id === id))
    .filter((i): i is ShopItem => !!i);

  return (
    <div className="lifesim-shop">
      {character.assets.map((asset) => {
        const income = ASSET_INCOME[asset];
        return (
          <div key={asset} className="lifesim-shop__item">
            <div className="lifesim-shop__info">
              <span className="lifesim-shop__name">Your {ASSET_LABELS[asset]}</span>
              <span className="lifesim-shop__desc">
                {income ? `Brings in ₦${income.toLocaleString()} a year.` : "Keeps life in Lagos bearable."}
              </span>
            </div>
          </div>
        );
      })}
      {owned.length === 0 && character.assets.length === 0 && (
        <p className="lifesim-hint">You don't own anything yet — the Browse tab has something for every budget.</p>
      )}
      {owned.map((item) => {
        const perks = describeItemPerks(item);
        const refund = Math.floor(item.price * SELL_RATE);
        return (
          <div key={item.id} className="lifesim-shop__item">
            <div className="lifesim-shop__info">
              <span className="lifesim-shop__name">{item.name}</span>
              {perks.map((p) => (
                <span key={p} className="lifesim-shop__desc">
                  {p}
                </span>
              ))}
            </div>
            <button className="rpg-choice-pill lifesim-shop__buy" onClick={() => onSell(item)}>
              {`Sell ₦${refund.toLocaleString()}`}
            </button>
          </div>
        );
      })}
      {owned.length > 0 && (
        <p className="lifesim-hint">
          Selling returns {Math.round(SELL_RATE * 100)}% of the price, and you can't buy that item back.
        </p>
      )}
    </div>
  );
}
