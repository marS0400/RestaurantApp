document.addEventListener('DOMContentLoaded', () => {
    const clusterSelect = document.getElementById('clusterSelect');
    const moreClusterRecipesButton = document.getElementById('moreClusterRecipesButton');
    const clusterRecipeCountInfo = document.getElementById('clusterRecipeCountInfo');
    const clusterResultsGrid = document.getElementById('clusterResultsGrid');

    const recipeModalElement = document.getElementById('recipeModal');
    let recipeModal = null;
    if (recipeModalElement) {
        recipeModal = new bootstrap.Modal(recipeModalElement);
    } else {
        console.error("Modal element #recipeModal not found!");
    }
    const recipeModalTitle = document.getElementById('recipeModalLabel');
    const recipeModalBody = document.getElementById('recipeModalBody');

    let allRecipesData = [];
    let recipeClustersData = [];

    let currentClusterRecipeIds = [];
    const recipesPerDisplay = 20;

    async function fetchRecipes() {
        try {
            const response = await fetch('./data/clean_DuLieu_vi.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching recipes:', error);
            return [];
        }
    }

    async function fetchRecipeClusters() {
        try {
            const response = await fetch('./data/recipe_clusters_vi.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Loaded recipe cluster data.");
            return data;
        } catch (error) {
            console.error('Error fetching recipe cluster data:', error);
            return {};
        }
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.classList.add('recipe-card', 'card');
        card.setAttribute('data-recipe-id', recipe.id);

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const cardTitle = document.createElement('h5');
        cardTitle.classList.add('card-title');
        cardTitle.textContent = recipe.name ? recipe.name : `Món ăn #${recipe.id}`;
        cardTitle.style.cursor = 'pointer';

        const ingredientList = document.createElement('ul');
        ingredientList.classList.add('ingredient-list');

        const ingredients = recipe.ingredients || [];
        const ingredientsToShow = ingredients.slice(0, 3);

        ingredientsToShow.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientList.appendChild(li);
        });

        if (ingredients.length > 3) {
            const li = document.createElement('li');
            li.textContent = '...';
            ingredientList.appendChild(li);
        }

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(ingredientList);
        card.appendChild(cardBody);

        return card;
    }

    function updateCountInfo() {
        if (!clusterRecipeCountInfo) return;

        const totalRecipes = currentClusterRecipeIds.length;
        const selectedCluster = clusterSelect.value;

        if (selectedCluster === "") {
            clusterRecipeCountInfo.textContent = '';
        } else if (totalRecipes === 0) {
            clusterRecipeCountInfo.textContent = `Nhóm ${selectedCluster} không có món ăn nào.`;
        }
        else {
            clusterRecipeCountInfo.textContent = `Tổng số món trong nhóm ${selectedCluster}: ${totalRecipes}.`;
        }
    }

    function shuffleArray(array) {
        const shuffledArray = [...array];
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
        }
        return shuffledArray;
    }

    function displayRandomSample() {
        if (!clusterResultsGrid || !allRecipesData || allRecipesData.length === 0) {
            console.warn("Results grid or recipe data not ready to display sample.");
            return;
        }

        clusterResultsGrid.innerHTML = '';

        if (!currentClusterRecipeIds || currentClusterRecipeIds.length === 0) {
            clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào trong cụm này.</p>';
            updateCountInfo();
            return;
        }

        const shuffledIds = shuffleArray(currentClusterRecipeIds);

        const recipeIdsToDisplay = shuffledIds.slice(0, recipesPerDisplay);

        const recipesToDisplay = recipeIdsToDisplay
            .map(id => allRecipesData.find(recipe => recipe.id === id))
            .filter(recipe => recipe !== undefined);


        if (recipesToDisplay.length === 0 && recipeIdsToDisplay.length > 0) {
            console.warn("Could not find full recipe details for any IDs in the random sample batch.");
            clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào trong cụm này (có thể do lỗi dữ liệu).</p>';
            updateCountInfo();
            return;
        }

        recipesToDisplay.forEach(recipe => {
            const card = createRecipeCard(recipe);
            clusterResultsGrid.appendChild(card);
        });

        updateCountInfo();

        if (currentClusterRecipeIds.length > 0) {
            moreClusterRecipesButton.disabled = false;
        } else {
            moreClusterRecipesButton.disabled = true;
        }
    }

    if (clusterSelect && moreClusterRecipesButton && clusterRecipeCountInfo && clusterResultsGrid) {
        clusterResultsGrid.innerHTML = '<p class="col-12 text-center text-muted">Đang tải dữ liệu...</p>';
        updateCountInfo();

        clusterSelect.disabled = true;
        moreClusterRecipesButton.disabled = true;


        Promise.all([fetchRecipes(), fetchRecipeClusters()])
            .then(([recipes, clusters]) => {
                allRecipesData = recipes;
                recipeClustersData = clusters;

                if (clusterResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu...</p>') {
                    clusterResultsGrid.innerHTML = '';
                }

                clusterSelect.disabled = false;

                if (clusterResultsGrid.innerHTML === '') {
                    clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một cụm từ danh sách để xem các món ăn tương đồng.</p>';
                    updateCountInfo();
                }

                clusterSelect.addEventListener('change', (event) => {
                    const selectedCluster = event.target.value;

                    clusterResultsGrid.innerHTML = '';
                    currentClusterRecipeIds = [];
                    moreClusterRecipesButton.disabled = true;

                    if (selectedCluster === "") {
                        clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một cụm từ danh sách để xem các món ăn tương đồng.</p>';
                        updateCountInfo();
                        return;
                    }

                    const clusterIndex = parseInt(selectedCluster) - 1;

                    const recipesInSelectedClusterObjects = recipeClustersData.filter(item => {
                        return item && typeof item.cluster === 'number' && item.cluster === clusterIndex;
                    });

                    const recipeIdsInCluster = recipesInSelectedClusterObjects.map(item => item.id);

                    currentClusterRecipeIds = recipeIdsInCluster;

                    displayRandomSample();

                });

                moreClusterRecipesButton.addEventListener('click', () => {
                    displayRandomSample();
                });

                if (clusterResultsGrid) {
                    console.log("Attaching click listener to cluster results grid for modal.");
                    clusterResultsGrid.addEventListener('click', (event) => {
                        const clickedTitleElement = event.target.closest('.card-title');

                        if (clickedTitleElement) {
                            const cardElement = clickedTitleElement.closest('.recipe-card');
                            if (!cardElement) {
                                console.error("Could not find parent card element for clicked title in results.");
                                return;
                            }

                            const recipeId = parseInt(cardElement.getAttribute('data-recipe-id'));

                            if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                                console.error("Modal not ready or recipe data not loaded for results click!");
                                return;
                            }

                            const fullRecipe = allRecipesData.find(r => r.id === recipeId);

                            if (fullRecipe) {
                                recipeModalTitle.textContent = fullRecipe.name ? fullRecipe.name : `Món ăn #${fullRecipe.id}`; // Sử dụng tên món ăn
                                const fullIngredientListHtml = fullRecipe.ingredients
                                    .map(ingredient => `<li>${ingredient}</li>`)
                                    .join('');
                                recipeModalBody.innerHTML = `<h6>Nguyên liệu:</h4><ul>${fullIngredientListHtml}</ul>`; // Sử dụng h6

                                recipeModal.show();

                            } else {
                                console.error(`Recipe with ID ${recipeId} not found in allRecipesData.`);
                            }
                        }
                    });
                } else {
                    console.error("Cluster results grid #clusterResultsGrid not found! Cannot attach click listener for modal.");
                }
            })
            .catch(error => {
                console.error("Error loading initial data for cluster page:", error);
                if (clusterResultsGrid) {
                    clusterResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu cần thiết.</p>';
                }
                if (clusterSelect) clusterSelect.disabled = true;
                if (moreClusterRecipesButton) moreClusterRecipesButton.disabled = true;
                updateCountInfo();
            });
    } else {
        console.error("Essential DOM elements (cluster select or results grid) not found! Data fetching skipped.");
        if (clusterResultsGrid) {
            clusterResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Lỗi khởi tạo trang: Không tìm thấy các phần tử cần thiết trên DOM.</p>';
        }
        if (moreClusterRecipesButton) moreClusterRecipesButton.disabled = true;
        updateCountInfo();
    }
});