// Orientační hodnoty na 100 g + typická porce. Jde o odhad (jako každá kalorička).
export type Food = {
  id: string;
  name: string;
  cat: string;
  kcal: number; // na 100 g
  p: number;    // bílkoviny / 100 g
  c: number;    // sacharidy / 100 g
  f: number;    // tuky / 100 g
  portionG: number;     // typická porce v gramech
  portionLabel: string; // popis porce (ks, plátek, porce…)
};

export const FOOD_CATS = [
  "Pečivo & přílohy",
  "Maso & ryby",
  "Mléčné & vejce",
  "Luštěniny & ořechy",
  "Zelenina",
  "Ovoce",
  "Tuky & dochucení",
  "Sladké & snacky",
  "Nápoje",
  "Hotová jídla",
];

export const FOODS: Food[] = [
  // Pečivo & přílohy
  { id: "rohlik", name: "Rohlík", cat: "Pečivo & přílohy", kcal: 290, p: 9, c: 54, f: 3, portionG: 43, portionLabel: "ks" },
  { id: "chleb", name: "Chléb kmínový", cat: "Pečivo & přílohy", kcal: 250, p: 8, c: 49, f: 1.5, portionG: 30, portionLabel: "plátek" },
  { id: "toust", name: "Toustový chléb", cat: "Pečivo & přílohy", kcal: 270, p: 9, c: 49, f: 3.5, portionG: 25, portionLabel: "plátek" },
  { id: "ryze", name: "Rýže vařená", cat: "Pečivo & přílohy", kcal: 130, p: 2.7, c: 28, f: 0.3, portionG: 150, portionLabel: "porce" },
  { id: "testoviny", name: "Těstoviny vařené", cat: "Pečivo & přílohy", kcal: 158, p: 6, c: 31, f: 1, portionG: 150, portionLabel: "porce" },
  { id: "brambory", name: "Brambory vařené", cat: "Pečivo & přílohy", kcal: 87, p: 2, c: 20, f: 0.1, portionG: 150, portionLabel: "porce" },
  { id: "knedlik", name: "Houskový knedlík", cat: "Pečivo & přílohy", kcal: 200, p: 6, c: 40, f: 1.5, portionG: 80, portionLabel: "2 plátky" },
  { id: "vlocky", name: "Ovesné vločky", cat: "Pečivo & přílohy", kcal: 370, p: 13, c: 60, f: 7, portionG: 50, portionLabel: "porce" },
  { id: "musli", name: "Müsli", cat: "Pečivo & přílohy", kcal: 360, p: 8, c: 65, f: 8, portionG: 50, portionLabel: "porce" },
  { id: "hranolky", name: "Hranolky", cat: "Pečivo & přílohy", kcal: 290, p: 3.4, c: 41, f: 15, portionG: 150, portionLabel: "porce" },

  // Maso & ryby
  { id: "kure-prsa", name: "Kuřecí prsa", cat: "Maso & ryby", kcal: 110, p: 23, c: 0, f: 1.5, portionG: 100, portionLabel: "porce" },
  { id: "kure-stehno", name: "Kuřecí stehno", cat: "Maso & ryby", kcal: 180, p: 18, c: 0, f: 12, portionG: 120, portionLabel: "ks" },
  { id: "veprova", name: "Vepřová kotleta", cat: "Maso & ryby", kcal: 230, p: 21, c: 0, f: 16, portionG: 120, portionLabel: "porce" },
  { id: "hovezi", name: "Hovězí steak", cat: "Maso & ryby", kcal: 220, p: 26, c: 0, f: 13, portionG: 150, portionLabel: "porce" },
  { id: "mlete", name: "Mleté maso (směs)", cat: "Maso & ryby", kcal: 240, p: 18, c: 0, f: 18, portionG: 100, portionLabel: "porce" },
  { id: "sunka", name: "Šunka", cat: "Maso & ryby", kcal: 110, p: 18, c: 1, f: 4, portionG: 30, portionLabel: "plátek" },
  { id: "salam", name: "Salám", cat: "Maso & ryby", kcal: 330, p: 15, c: 1, f: 30, portionG: 30, portionLabel: "plátek" },
  { id: "parek", name: "Párek", cat: "Maso & ryby", kcal: 270, p: 11, c: 2, f: 24, portionG: 80, portionLabel: "ks" },
  { id: "slanina", name: "Slanina", cat: "Maso & ryby", kcal: 540, p: 9, c: 0, f: 56, portionG: 20, portionLabel: "plátek" },
  { id: "losos", name: "Losos", cat: "Maso & ryby", kcal: 208, p: 20, c: 0, f: 13, portionG: 120, portionLabel: "porce" },
  { id: "tunak", name: "Tuňák (ve vlastní šťávě)", cat: "Maso & ryby", kcal: 110, p: 25, c: 0, f: 1, portionG: 80, portionLabel: "konzerva" },
  { id: "treska", name: "Treska / bílá ryba", cat: "Maso & ryby", kcal: 82, p: 18, c: 0, f: 0.7, portionG: 120, portionLabel: "porce" },

  // Mléčné & vejce
  { id: "vejce", name: "Vejce", cat: "Mléčné & vejce", kcal: 155, p: 13, c: 1.1, f: 11, portionG: 60, portionLabel: "ks" },
  { id: "mleko", name: "Mléko polotučné", cat: "Mléčné & vejce", kcal: 47, p: 3.3, c: 4.8, f: 1.5, portionG: 250, portionLabel: "sklenice" },
  { id: "jogurt-bily", name: "Bílý jogurt", cat: "Mléčné & vejce", kcal: 60, p: 5, c: 4, f: 3, portionG: 150, portionLabel: "kelímek" },
  { id: "jogurt-recky", name: "Řecký jogurt", cat: "Mléčné & vejce", kcal: 97, p: 9, c: 4, f: 5, portionG: 150, portionLabel: "kelímek" },
  { id: "tvaroh", name: "Tvaroh polotučný", cat: "Mléčné & vejce", kcal: 130, p: 18, c: 4, f: 5, portionG: 100, portionLabel: "porce" },
  { id: "cottage", name: "Cottage sýr", cat: "Mléčné & vejce", kcal: 98, p: 12, c: 3, f: 4, portionG: 100, portionLabel: "porce" },
  { id: "eidam", name: "Sýr eidam 30 %", cat: "Mléčné & vejce", kcal: 270, p: 28, c: 0, f: 17, portionG: 30, portionLabel: "plátek" },
  { id: "mozzarella", name: "Mozzarella", cat: "Mléčné & vejce", kcal: 250, p: 18, c: 1, f: 19, portionG: 30, portionLabel: "porce" },
  { id: "maslo", name: "Máslo", cat: "Mléčné & vejce", kcal: 740, p: 0.7, c: 0.7, f: 82, portionG: 10, portionLabel: "lžička" },

  // Luštěniny & ořechy
  { id: "cocka", name: "Čočka vařená", cat: "Luštěniny & ořechy", kcal: 116, p: 9, c: 20, f: 0.4, portionG: 150, portionLabel: "porce" },
  { id: "fazole", name: "Fazole vařené", cat: "Luštěniny & ořechy", kcal: 127, p: 9, c: 22, f: 0.5, portionG: 150, portionLabel: "porce" },
  { id: "cizrna", name: "Cizrna vařená", cat: "Luštěniny & ořechy", kcal: 164, p: 9, c: 27, f: 2.6, portionG: 150, portionLabel: "porce" },
  { id: "tofu", name: "Tofu", cat: "Luštěniny & ořechy", kcal: 120, p: 12, c: 2, f: 7, portionG: 100, portionLabel: "porce" },
  { id: "arasidy", name: "Arašídy", cat: "Luštěniny & ořechy", kcal: 567, p: 26, c: 16, f: 49, portionG: 30, portionLabel: "hrst" },
  { id: "mandle", name: "Mandle", cat: "Luštěniny & ořechy", kcal: 579, p: 21, c: 22, f: 50, portionG: 30, portionLabel: "hrst" },
  { id: "vlasske", name: "Vlašské ořechy", cat: "Luštěniny & ořechy", kcal: 654, p: 15, c: 14, f: 65, portionG: 30, portionLabel: "hrst" },
  { id: "arasidove-maslo", name: "Arašídové máslo", cat: "Luštěniny & ořechy", kcal: 590, p: 25, c: 20, f: 50, portionG: 20, portionLabel: "lžíce" },

  // Zelenina
  { id: "rajce", name: "Rajče", cat: "Zelenina", kcal: 18, p: 0.9, c: 3.9, f: 0.2, portionG: 100, portionLabel: "ks" },
  { id: "okurka", name: "Okurka", cat: "Zelenina", kcal: 15, p: 0.7, c: 3.6, f: 0.1, portionG: 100, portionLabel: "porce" },
  { id: "paprika", name: "Paprika", cat: "Zelenina", kcal: 31, p: 1, c: 6, f: 0.3, portionG: 100, portionLabel: "ks" },
  { id: "mrkev", name: "Mrkev", cat: "Zelenina", kcal: 41, p: 0.9, c: 10, f: 0.2, portionG: 80, portionLabel: "ks" },
  { id: "brokolice", name: "Brokolice", cat: "Zelenina", kcal: 34, p: 2.8, c: 7, f: 0.4, portionG: 100, portionLabel: "porce" },
  { id: "spenat", name: "Špenát", cat: "Zelenina", kcal: 23, p: 2.9, c: 3.6, f: 0.4, portionG: 100, portionLabel: "porce" },
  { id: "salat", name: "Listový salát", cat: "Zelenina", kcal: 15, p: 1.4, c: 2.9, f: 0.2, portionG: 50, portionLabel: "porce" },
  { id: "avokado", name: "Avokádo", cat: "Zelenina", kcal: 160, p: 2, c: 9, f: 15, portionG: 100, portionLabel: "půlka" },
  { id: "kukurice", name: "Kukuřice", cat: "Zelenina", kcal: 86, p: 3.2, c: 19, f: 1.2, portionG: 100, portionLabel: "porce" },

  // Ovoce
  { id: "jablko", name: "Jablko", cat: "Ovoce", kcal: 52, p: 0.3, c: 14, f: 0.2, portionG: 150, portionLabel: "ks" },
  { id: "banan", name: "Banán", cat: "Ovoce", kcal: 89, p: 1.1, c: 23, f: 0.3, portionG: 120, portionLabel: "ks" },
  { id: "pomeranc", name: "Pomeranč", cat: "Ovoce", kcal: 47, p: 0.9, c: 12, f: 0.1, portionG: 130, portionLabel: "ks" },
  { id: "jahody", name: "Jahody", cat: "Ovoce", kcal: 32, p: 0.7, c: 8, f: 0.3, portionG: 100, portionLabel: "porce" },
  { id: "boruvky", name: "Borůvky", cat: "Ovoce", kcal: 57, p: 0.7, c: 14, f: 0.3, portionG: 100, portionLabel: "porce" },
  { id: "hrozny", name: "Hroznové víno", cat: "Ovoce", kcal: 69, p: 0.7, c: 18, f: 0.2, portionG: 100, portionLabel: "porce" },
  { id: "hruska", name: "Hruška", cat: "Ovoce", kcal: 57, p: 0.4, c: 15, f: 0.1, portionG: 150, portionLabel: "ks" },
  { id: "meloun", name: "Meloun", cat: "Ovoce", kcal: 30, p: 0.6, c: 8, f: 0.2, portionG: 200, portionLabel: "porce" },

  // Tuky & dochucení
  { id: "olivovy-olej", name: "Olivový olej", cat: "Tuky & dochucení", kcal: 884, p: 0, c: 0, f: 100, portionG: 10, portionLabel: "lžíce" },
  { id: "slun-olej", name: "Slunečnicový olej", cat: "Tuky & dochucení", kcal: 884, p: 0, c: 0, f: 100, portionG: 10, portionLabel: "lžíce" },
  { id: "med", name: "Med", cat: "Tuky & dochucení", kcal: 304, p: 0.3, c: 82, f: 0, portionG: 20, portionLabel: "lžíce" },
  { id: "kecup", name: "Kečup", cat: "Tuky & dochucení", kcal: 110, p: 1.2, c: 26, f: 0.2, portionG: 20, portionLabel: "lžíce" },
  { id: "majoneza", name: "Majonéza", cat: "Tuky & dochucení", kcal: 680, p: 1, c: 2, f: 75, portionG: 15, portionLabel: "lžíce" },
  { id: "cukr", name: "Cukr", cat: "Tuky & dochucení", kcal: 400, p: 0, c: 100, f: 0, portionG: 8, portionLabel: "lžička" },

  // Sladké & snacky
  { id: "cokolada", name: "Mléčná čokoláda", cat: "Sladké & snacky", kcal: 535, p: 7, c: 59, f: 30, portionG: 25, portionLabel: "kostky" },
  { id: "susenka", name: "Sušenka", cat: "Sladké & snacky", kcal: 480, p: 6, c: 64, f: 22, portionG: 15, portionLabel: "ks" },
  { id: "croissant", name: "Croissant", cat: "Sladké & snacky", kcal: 406, p: 8, c: 45, f: 21, portionG: 60, portionLabel: "ks" },
  { id: "bramburky", name: "Brambůrky", cat: "Sladké & snacky", kcal: 540, p: 6, c: 53, f: 34, portionG: 30, portionLabel: "hrst" },
  { id: "zmrzlina", name: "Zmrzlina", cat: "Sladké & snacky", kcal: 207, p: 3.5, c: 24, f: 11, portionG: 100, portionLabel: "porce" },
  { id: "protein-tycinka", name: "Proteinová tyčinka", cat: "Sladké & snacky", kcal: 350, p: 30, c: 35, f: 10, portionG: 50, portionLabel: "ks" },

  // Nápoje
  { id: "cola", name: "Cola", cat: "Nápoje", kcal: 42, p: 0, c: 11, f: 0, portionG: 330, portionLabel: "plechovka" },
  { id: "pivo", name: "Pivo 10°", cat: "Nápoje", kcal: 35, p: 0.5, c: 3, f: 0, portionG: 500, portionLabel: "půllitr" },
  { id: "vino", name: "Bílé víno", cat: "Nápoje", kcal: 82, p: 0.1, c: 2.6, f: 0, portionG: 150, portionLabel: "sklenice" },
  { id: "dzus", name: "Pomerančový džus", cat: "Nápoje", kcal: 45, p: 0.7, c: 10, f: 0.2, portionG: 250, portionLabel: "sklenice" },
  { id: "kava-mleko", name: "Káva s mlékem", cat: "Nápoje", kcal: 20, p: 1, c: 2, f: 1, portionG: 200, portionLabel: "šálek" },
  { id: "protein-napoj", name: "Proteinový nápoj (odměrka)", cat: "Nápoje", kcal: 380, p: 80, c: 8, f: 6, portionG: 30, portionLabel: "odměrka" },

  // Hotová jídla
  { id: "pizza", name: "Pizza", cat: "Hotová jídla", kcal: 266, p: 11, c: 33, f: 10, portionG: 300, portionLabel: "porce" },
  { id: "svickova", name: "Svíčková s knedlíkem", cat: "Hotová jídla", kcal: 180, p: 7, c: 20, f: 8, portionG: 400, portionLabel: "porce" },
  { id: "gulas", name: "Guláš s knedlíkem", cat: "Hotová jídla", kcal: 160, p: 8, c: 16, f: 7, portionG: 400, portionLabel: "porce" },
  { id: "smazak", name: "Smažený sýr + hranolky", cat: "Hotová jídla", kcal: 270, p: 10, c: 22, f: 16, portionG: 300, portionLabel: "porce" },
  { id: "caesar", name: "Caesar salát", cat: "Hotová jídla", kcal: 180, p: 10, c: 8, f: 12, portionG: 250, portionLabel: "porce" },
  { id: "spagety", name: "Špagety boloňské", cat: "Hotová jídla", kcal: 150, p: 7, c: 20, f: 4, portionG: 350, portionLabel: "porce" },
];
