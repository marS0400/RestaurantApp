document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('recipeCardsContainer');
    const cardWidth = 250;
    const cardMarginRight = 15;
    const numberOfRandomRecipes = 10;

    const suggestRecipeButton = document.getElementById('suggestRecipeButton');
    suggestRecipeButton.addEventListener('click', () => {
        window.location.href = 'GoiYCongThuc.html';
    });

    const suggestRecipeButton2 = document.getElementById('suggestRecipeButton2');
    suggestRecipeButton2.addEventListener('click', () => {
        window.location.href = 'GoiYCongThuc2.html';
    });

    const buildMenuButton = document.getElementById('buildMenuButton');
    buildMenuButton.addEventListener('click', () => {
        window.location.href = 'XayDungThucDon.html';
    });

    let allRecipesData = [];
    const recipeModalElement = document.getElementById('recipeModal');
    let recipeModal = null;
    if (recipeModalElement) {
        recipeModal = new bootstrap.Modal(recipeModalElement);
    } else {
        console.error("Modal element #recipeModal not found!");
    }

    const recipeModalTitle = document.getElementById('recipeModalLabel');
    const recipeModalBody = document.getElementById('recipeModalBody');

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
            cardsContainer.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn.</p>';
            return [];
        }
    }

    function getRandomRecipes(recipes, n) {
        if (!recipes || recipes.length === 0) return [];
        const recipesCopy = [...recipes];
        const shuffled = recipesCopy.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.classList.add('recipe-card', 'card');
        card.setAttribute('data-recipe-id', recipe.id);

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const cardTitle = document.createElement('h5');
        cardTitle.classList.add('card-title');
        cardTitle.textContent = `Món ăn #${recipe.id}`;

        const ingredientList = document.createElement('ul');
        ingredientList.classList.add('ingredient-list');

        const ingredients = recipe.ingredients || [];
        const ingredientsToShow = ingredients.slice(0, 3);

        ingredientsToShow.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = `- ${ingredient}`;
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

    function setupScrollAnimation() {
        const container = cardsContainer;
        let totalContentWidth = 0;
        container.querySelectorAll('.recipe-card').forEach(card => {
            totalContentWidth += card.offsetWidth + cardMarginRight;
        });

        container.style.width = `${totalContentWidth}px`;

        const cards = container.innerHTML;
        container.innerHTML += cards;

        const scrollDistance = totalContentWidth;

        const animationDuration = (scrollDistance / 50);

        container.style.setProperty('--scroll-distance', `-${scrollDistance}px`);

        container.style.setProperty('animation-duration', `${animationDuration}s`);
    }

    if (cardsContainer) {
        cardsContainer.addEventListener('click', (event) => {
            const clickedTitleElement = event.target.closest('.card-title');

            if (clickedTitleElement) {
                const cardElement = clickedTitleElement.closest('.recipe-card');
                if (!cardElement) {
                    return;
                }

                const recipeId = cardElement.getAttribute('data-recipe-id');

                if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                    return;
                }

                const fullRecipe = allRecipesData.find(r => r.id == recipeId);

                if (fullRecipe) {
                    recipeModalTitle.textContent = `Món ăn #${fullRecipe.id}`;

                    const fullIngredientListHtml = fullRecipe.ingredients
                        .map(ingredient => `<li>${ingredient}</li>`)
                        .join('');
                    recipeModalBody.innerHTML = `<h6>Nguyên liệu:</h6><ul>${fullIngredientListHtml}</ul>`;

                    recipeModal.show();

                } else {
                    console.error(`Recipe with ID ${recipeId} not found in allRecipesData.`);
                }

            }
        });
    } else {
        console.error("Cards container #recipeCardsContainer not found! Cannot attach click listener.");
    }

    fetchRecipes().then(recipes => {
        allRecipesData = recipes;
        const randomRecipes = getRandomRecipes(recipes, numberOfRandomRecipes);

        if (randomRecipes.length === 0) {
            if (cardsContainer.innerHTML === '') {
                cardsContainer.innerHTML = '<p class="col-12 text-center">Không tìm thấy món ăn nào để hiển thị.</p>';
            }
            return;
        }

        cardsContainer.innerHTML = '';

        randomRecipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            cardsContainer.appendChild(card);
        });

        setTimeout(setupScrollAnimation, 50);
    });
});