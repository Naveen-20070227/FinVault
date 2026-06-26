// Premium Skeleton Loader Templates (replaces L6)

export const skeleton = {
    table(rows = 5, cols = 5) {
        let ths = "";
        for (let i = 0; i < cols; i++) {
            ths += `<th><div class="skeleton" style="width: 60px; height: 16px; border-radius: 4px;"></div></th>`;
        }

        let trs = "";
        for (let r = 0; r < rows; r++) {
            let tds = "";
            for (let c = 0; c < cols; c++) {
                // Vary width to look organic
                const width = 60 + (r * 7 + c * 13) % 40;
                tds += `<td><div class="skeleton" style="width: ${width}%; height: 16px; border-radius: 4px;"></div></td>`;
            }
            trs += `<tr>${tds}</tr>`;
        }

        return `
            <div class="table-container fade-in">
                <table>
                    <thead><tr>${ths}</tr></thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
        `;
    },

    cardGrid(cardsCount = 3) {
        let cards = "";
        for (let i = 0; i < cardsCount; i++) {
            cards += `
                <div class="card" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="skeleton" style="width: 40%; height: 20px; border-radius: 4px;"></div>
                    <div class="skeleton" style="width: 80%; height: 32px; border-radius: 8px; margin-top: 8px;"></div>
                    <div class="skeleton" style="width: 60%; height: 14px; border-radius: 4px;"></div>
                </div>
            `;
        }
        return `<div class="grid-cols-${cardsCount} fade-in">${cards}</div>`;
    },

    chart() {
        return `
            <div class="card" style="display: flex; flex-direction: column; gap: 20px; height: 300px; justify-content: space-between;">
                <div class="skeleton" style="width: 30%; height: 20px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 100%; flex: 1; border-radius: 8px;"></div>
            </div>
        `;
    }
};
export default skeleton;
