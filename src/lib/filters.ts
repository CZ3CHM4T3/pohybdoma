// Jediný zdroj pravdy pro možnosti filtrů – používá je veřejná knihovna i admin,
// aby přiřazené hodnoty u videa vždy odpovídaly filtrům.

export const FILTER_DIFFICULTIES = ["začátečník", "mírně pokročilý", "pokročilý"];

export const FILTER_BODY = [
  "záda", "krk", "ramena", "hrudní páteř", "kyčle", "kolena",
  "kotníky", "zápěstí", "pánev", "chodidla", "core", "celé tělo",
];

export const FILTER_SYSTEMS = [
  "floorwork", "zdravotní cvičení", "dechová cvičení", "foamroller",
  "kettlebell", "kruhy", "hrazda", "bandy a gumy", "medicinbal",
];

export const FILTER_PROPS = [
  "gauč", "židle", "tyč", "stůl", "zeď", "zem", "schody", "ručník", "polštář",
];

export const FILTER_GOALS = ["bolest", "ztuhlost", "mobilita", "síla", "prevence", "po zranění"];

export const FILTER_SUITABILITY = [
  "těhotenství", "akutní bolest zad", "problémy s rameny",
  "problémy s koleny", "vysoký tlak", "závratě", "po operaci",
];
