/*
  Pokedex JS

  - Carga los primeros 151 pokémon desde la API de PokéAPI.
  - Genera tarjetas con nombre, id, imagen, tipo y stats.
  - Permite filtrar la lista por ID, nombre (contiene) y tipo.
*/

const api = {
  base: "https://pokeapi.co/api/v2",
  pokemonList(limit = 151) {
    return fetch(`${this.base}/pokemon?limit=${limit}`).then((res) => {
      if (!res.ok) throw new Error(`Error al obtener lista: ${res.status}`);
      return res.json();
    });
  },
  pokemonDetail(url) {
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Error al obtener detalle: ${res.status}`);
      return res.json();
    });
  },
  types() {
    return fetch(`${this.base}/type`).then((res) => {
      if (!res.ok) throw new Error(`Error al obtener tipos: ${res.status}`);
      return res.json();
    });
  },
};

const state = {
  allPokemons: [],
  filteredPokemons: [],
  filters: {
    name: "",
    id: "",
    type: "",
  },
};

const elements = {
  grid: document.getElementById("pokemonGrid"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  filterName: document.getElementById("filterName"),
  filterId: document.getElementById("filterId"),
  filterType: document.getElementById("filterType"),
  filterReset: document.getElementById("filterReset"),
};

function setError(message) {
  elements.error.hidden = false;
  elements.error.textContent = message;
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = "";
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
}

function buildTypeClass(type) {
  return `type type--${type.toLowerCase().replace(/\s/g, "-")}`;
}

function createPokemonCard(pokemon) {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <header class="card__header">
      <h2 class="card__title">${pokemon.name}</h2>
      <span class="card__id">#${pokemon.id.toString().padStart(3, "0")}</span>
    </header>

    <img
      class="card__sprite"
      src="${pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites?.front_default || ""}"
      alt="${pokemon.name}"
      loading="lazy"
      width="160"
      height="160"
    />

    <div class="types">
      ${pokemon.types
        .map(
          (typeSlot) =>
            `<span class="${buildTypeClass(typeSlot.type.name)}">${typeSlot.type.name}</span>`,
        )
        .join("")}
    </div>

    <div class="stats">
      <details>
        <summary>Stats</summary>
        <ul>
          ${pokemon.stats
            .map(
              (stat) =>
                `<li><strong>${stat.stat.name}:</strong> ${stat.base_stat}</li>`,
            )
            .join("")}
        </ul>
      </details>
    </div>
  `;

  return card;
}

function renderPokemons(pokemons) {
  elements.grid.innerHTML = "";

  if (!pokemons.length) {
    elements.grid.innerHTML = `<p class="loading">No se encontró ningún pokémon con esos filtros.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  pokemons.forEach((pokemon) => {
    fragment.appendChild(createPokemonCard(pokemon));
  });

  elements.grid.appendChild(fragment);
}

function applyFilters() {
  const { name, id, type } = state.filters;

  state.filteredPokemons = state.allPokemons.filter((pokemon) => {
    const matchesName = name
      ? pokemon.name.toLowerCase().includes(name.toLowerCase())
      : true;
    const matchesId = id ? pokemon.id === Number(id) : true;
    const matchesType = type
      ? pokemon.types.some((slot) => slot.type.name === type)
      : true;

    return matchesName && matchesId && matchesType;
  });

  renderPokemons(state.filteredPokemons);
}

function setupFilters() {
  elements.filterName.addEventListener("input", (event) => {
    state.filters.name = event.target.value.trim();
    applyFilters();
  });

  elements.filterId.addEventListener("input", (event) => {
    state.filters.id = event.target.value.trim();
    applyFilters();
  });

  elements.filterType.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    applyFilters();
  });

  elements.filterReset.addEventListener("click", () => {
    elements.filterName.value = "";
    elements.filterId.value = "";
    elements.filterType.value = "";

    state.filters = { name: "", id: "", type: "" };
    applyFilters();
  });
}

function populateTypeOptions(types) {
  const select = elements.filterType;
  const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.name;
    option.textContent = type.name;
    select.appendChild(option);
  });
}

async function loadAllPokemons() {
  setLoading(true);
  clearError();

  try {
    const [listResult, typesResult] = await Promise.all([
      api.pokemonList(151),
      api.types(),
    ]);

    populateTypeOptions(typesResult.results);

    // Fetch details for each pokémon in parallel, but limit concurrency to avoid hitting API limits
    const fetchQueue = [...listResult.results];
    const concurrency = 10;

    const results = [];
    while (fetchQueue.length) {
      const batch = fetchQueue.splice(0, concurrency);
      const batchPromises = batch.map((entry) => api.pokemonDetail(entry.url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    state.allPokemons = results.sort((a, b) => a.id - b.id);
    state.filteredPokemons = [...state.allPokemons];

    renderPokemons(state.filteredPokemons);
  } catch (error) {
    console.error(error);
    setError(`No se pudo cargar la información.
Verifica tu conexión e intenta de nuevo.`);
  } finally {
    setLoading(false);
  }
}

function init() {
  setupFilters();
  loadAllPokemons();
}

init();
