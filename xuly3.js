document.addEventListener('DOMContentLoaded', () => {
    const seasonalResultsGrid = document.getElementById('seasonalResultsGrid');
    const seasonButtons = document.querySelectorAll('.season-selector .btn');

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

    const hotSeasonIngredients = [
        "đậu bắp", "đào thái lát", "quả cam", "nước cam", "vỏ cam bào", "quả anh đào",
        "bí ngòi", "bí vàng mùa hè", "bắp ngô nguyên trái", "cà chua bi", "húng quế",
        "quả bơ", "cà chua xanh mexico", "ngò rí", "lá bạc hà", "giá đỗ xanh",
        "lá xà lách", "nước ép me", "quả dứa", "củ đậu", "sữa chua nguyên bản kiểu hy lạp",
        "dưa chuột anh", "cà chua", "thì là tươi", "sốt cà chua húng quế", "kem vani"
    ];

    const coldSeasonIngredients = [
        "tỏi tây", "hạt bí ngô", "mỡ bò/cừu cứng", "cà rốt", "khoai tây làm bánh",
        "củ cải vàng", "đậu lăng nâu", "hạt nhục đậu khấu", "khoai lang", "đinh hương",
        "thịt gà tây", "táo granny smith", "nước ép táo lên men", "gừng tươi",
        "củ riềng", "hạt tiêu Tứ Xuyên", "cải thảo", "củ cải", "quả lê", "hạt tiêu Jamaica",
        "củ dền", "bắp cải savoia", "thịt bò hầm", "khoai tây nhiều tinh bột", "khoai tây",
        "đậu hà lan", "hạt thì là Ai Cập", "bạch đậu khấu", "ngũ vị hương"
    ];

    const hotSeasonIngredientsLower = hotSeasonIngredients.map(ing => ing.toLowerCase());
    const coldSeasonIngredientsLower = coldSeasonIngredients.map(ing => ing.toLowerCase());

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
            if (seasonalResultsGrid) {
                seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn.</p>';
            }
            return [];
        }
    }

    function classifyRecipeSeasonal(recipe) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return 'Quanh năm';
        }

        let hotScore = 0;
        let coldScore = 0;

        const recipeIngredientsLower = recipe.ingredients.map(ing => ing.toLowerCase());

        recipeIngredientsLower.forEach(recipeIng => {
            if (hotSeasonIngredientsLower.includes(recipeIng)) {
                hotScore++;
            }
            if (coldSeasonIngredientsLower.includes(recipeIng)) {
                coldScore++;
            }
        });

        if (hotScore > coldScore && hotScore > 0) {
            return 'Mùa nóng';
        } else if (coldScore > hotScore && coldScore > 0) {
            return 'Mùa lạnh';
        } else {
            return 'Quanh năm';
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

    function displayRecipes(recipesToDisplay) {
        if (!seasonalResultsGrid) return;

        seasonalResultsGrid.innerHTML = '';

        if (!recipesToDisplay || recipesToDisplay.length === 0) {
            seasonalResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào.</p>';
            return;
        }

        recipesToDisplay.forEach(recipe => {
            const card = createRecipeCard(recipe);
            seasonalResultsGrid.appendChild(card);
        });
    }

    function shuffleArray(array) {
        const shuffledArray = [...array];
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
        }
        return shuffledArray;
    }

    function filterAndDisplayBySeason(selectedSeason) {
        if (!allRecipesData || allRecipesData.length === 0) {
            console.warn("Recipe data not loaded yet for seasonal filtering.");
            displayRecipes([]);
            return;
        }

        console.log(`Filtering recipes for season: ${selectedSeason}`);

        const filteredRecipes = allRecipesData.filter(recipe => {
            const recipeSeason = classifyRecipeSeasonal(recipe);
            if (selectedSeason === 'Quanh năm' && recipeSeason === 'Quanh năm') return true;
            if (selectedSeason === 'Mùa nóng' && recipeSeason === 'Mùa nóng') return true;
            if (selectedSeason === 'Mùa lạnh' && recipeSeason === 'Mùa lạnh') return true;
            if (selectedSeason === 'Quanh năm' && recipeSeason === 'Hỗn hợp/Quanh năm') return true;
            // if (selectedSeason === 'Mùa nóng' && recipeSeason === 'Hỗn hợp/Quanh năm') return true; // Thêm món hỗn hợp vào mục Mùa nóng
            // if (selectedSeason === 'Mùa lạnh' && recipeSeason === 'Hỗn hợp/Quanh năm') return true; // Thêm món hỗn hợp vào mục Mùa lạnh

            return false;
        });

        if (filteredRecipes.length === 0) {
            if (seasonalResultsGrid) {
                seasonalResultsGrid.innerHTML = `<p class="col-12 text-center">Không tìm thấy công thức nào phù hợp với mùa "${selectedSeason}" trong dữ liệu.</p>`;
            }
            return;
        }

        const shuffledRecipes = shuffleArray(filteredRecipes);

        const recipesToDisplay = shuffledRecipes.slice(0, 5); // Lấy 5 món đầu tiên

        displayRecipes(recipesToDisplay);
    }

    if (seasonalResultsGrid && seasonButtons && seasonButtons.length > 0) {
        seasonalResultsGrid.innerHTML = '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>';

        fetchRecipes()
            .then(recipes => {
                allRecipesData = recipes;

                if (seasonalResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>') {
                    seasonalResultsGrid.innerHTML = '';
                }

                seasonButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const selectedSeason = button.getAttribute('data-season');
                        if (selectedSeason) {
                            seasonButtons.forEach(btn => btn.classList.remove('active'));
                            button.classList.add('active');

                            filterAndDisplayBySeason(selectedSeason);
                        }
                    });
                });

                if (seasonalResultsGrid) {
                    seasonalResultsGrid.addEventListener('click', (event) => {
                        const clickedTitleElement = event.target.closest('.card-title');

                        if (clickedTitleElement) {
                            const cardElement = clickedTitleElement.closest('.recipe-card');
                            if (!cardElement) {
                                console.error("Could not find parent card element for clicked title in results.");
                                return;
                            }

                            const recipeId = cardElement.getAttribute('data-recipe-id');

                            if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                                console.error("Modal not ready or recipe data not loaded for results click!");
                                return;
                            }

                            const fullRecipe = allRecipesData.find(r => r.id == recipeId);

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
                    console.error("Seasonal results grid #seasonalResultsGrid not found! Cannot attach click listener for modal.");
                }

                const defaultSeasonButton = document.querySelector('.season-selector .btn[data-season="Quanh năm"]');
                if (defaultSeasonButton) {

                } else {
                    if (seasonalResultsGrid && seasonalResultsGrid.innerHTML === '') {
                        seasonalResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một mùa để xem thực đơn.</p>';
                    }
                }


            })
            .catch(error => {
                console.error("Error loading initial recipe data:", error);
                if (seasonalResultsGrid && seasonalResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>') {
                    seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn cần thiết.</p>';
                }
            });

    } else {
        console.error("Essential DOM elements (results grid or season buttons) not found! Data fetching skipped.");
        if (seasonalResultsGrid) {
            seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Lỗi khởi tạo trang: Không tìm thấy các phần tử cần thiết trên DOM.</p>';
        }
    }
});