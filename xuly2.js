document.addEventListener('DOMContentLoaded', () => {
    const ingredientInput = document.getElementById('ingredientInput');
    const getSuggestionsButton = document.getElementById('getSuggestionsButton');
    const suggestionResultsGrid = document.getElementById('suggestionResultsGrid');
    const suggestedIngredientsDisplay = document.getElementById('suggestedIngredientsDisplay');
    const ingredientSuggestionsDropdown = document.getElementById('ingredientSuggestionsDropdown');

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
    let associationRulesData = [];
    let uniqueIngredients = [];

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
            if (suggestionResultsGrid) {
                suggestionResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn.</p>';
            }
            return [];
        }
    }

    async function fetchAssociationRules() {
        try {
            const response = await fetch('./data/association_rules_vi.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching association rules:', error);
            return [];
        }
    }

    async function fetchUniqueIngredients() {
        try {
            const response = await fetch('./data/unique_ingredients_list_vi.json'); // Đảm bảo đúng đường dẫn
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching unique ingredients list:', error);
            return [];
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
        cardTitle.textContent = `Món ăn #${recipe.id}`;
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

    function updateSuggestedIngredientsDisplay(inputIngredients) {
        if (!suggestedIngredientsDisplay) return;

        suggestedIngredientsDisplay.innerHTML = '';

        if (!associationRulesData || associationRulesData.length === 0 || !inputIngredients || inputIngredients.length === 0) {
            return;
        }

        let suggestedConsequents = new Set();

        const relevantRules = associationRulesData.filter(rule => {
            if (!rule.antecedents || rule.antecedents.length === 0) return false;
            return inputIngredients.some(inputIng =>
                rule.antecedents.some(ruleAnt =>
                    ruleAnt.toLowerCase() === inputIng.toLowerCase()
                )
            );
        });

        // Sắp xếp luật liên quan theo Confidence và Lift (Ưu tiên cho gợi ý tốt hơn)
        relevantRules.sort((a, b) => {
            if (b.confidence !== a.confidence) {
                return b.confidence - a.confidence;
            }
            return b.lift - a.lift;
        });

        let rankedSuggestions = [];
        const addedSuggestions = new Set();

        for (const rule of relevantRules) {
            if (rule.consequents) {
                for (const consequent of rule.consequents) {
                    const lowerCaseConsequent = consequent.toLowerCase();
                    if (!inputIngredients.some(inputIng => inputIng.toLowerCase() === lowerCaseConsequent) && !addedSuggestions.has(lowerCaseConsequent)) {
                        rankedSuggestions.push(consequent);
                        addedSuggestions.add(lowerCaseConsequent);
                    }
                }
            }
        }


        if (rankedSuggestions.length > 0) {
            const maxDisplaySuggestions = 15;
            const limitedSuggestedListItems = rankedSuggestions.slice(0, maxDisplaySuggestions).map(ing => `<li>${ing}</li>`).join('');

            suggestedIngredientsDisplay.innerHTML = `<span>Gợi ý thêm:</span> <ul>${limitedSuggestedListItems}</ul>`;
            if (rankedSuggestions.length > maxDisplaySuggestions) {
                suggestedIngredientsDisplay.innerHTML += ' <span>...</span>';
            }

        } else {
            suggestedIngredientsDisplay.innerHTML = '';
        }
    }

    function displaySuggestionsDropdown(suggestions, type) {
        if (!ingredientSuggestionsDropdown) return;

        ingredientSuggestionsDropdown.innerHTML = '';

        if (suggestions && suggestions.length > 0) {
            const ul = document.createElement('ul');

            if (type === 'association') {
                const titleLi = document.createElement('li');
                titleLi.textContent = 'Gợi ý nguyên liệu tiếp theo';
                titleLi.style.fontWeight = 'bold';
                titleLi.style.cursor = 'default';
                titleLi.style.borderBottom = '1px solid #ccc';
                titleLi.style.backgroundColor = '#eee';
                ul.appendChild(titleLi);
            }

            suggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                ul.appendChild(li);
            });

            ingredientSuggestionsDropdown.appendChild(ul);
            ingredientSuggestionsDropdown.style.display = 'block';

        } else {
            hideSuggestionsDropdown();
        }
    }

    function hideSuggestionsDropdown() {
        if (ingredientSuggestionsDropdown) {
            ingredientSuggestionsDropdown.style.display = 'none';
        }
    }

    if (ingredientInput && ingredientSuggestionsDropdown && uniqueIngredients && associationRulesData) { // Đảm bảo data đã sẵn sàng
        ingredientInput.addEventListener('input', () => {
            const currentValue = ingredientInput.value;
            const lastCommaIndex = currentValue.lastIndexOf(',');
            const typingSegment = lastCommaIndex === -1
                ? currentValue.trim()
                : currentValue.substring(lastCommaIndex + 1).trim();

            const enteredIngredients = lastCommaIndex === -1
                ? []
                : currentValue.substring(0, lastCommaIndex).split(',')
                    .map(item => item.trim())
                    .filter(item => item !== '');

            if (typingSegment.length >= 1 && uniqueIngredients.length > 0) {
                // Case 1: Người dùng đang gõ một nguyên liệu mới (typingSegment không rỗng)
                // Thực hiện Autocomplete từ danh sách nguyên liệu duy nhất

                const matchingIngredients = uniqueIngredients.filter(ingredient =>
                    ingredient.toLowerCase().startsWith(typingSegment.toLowerCase())
                );

                displaySuggestionsDropdown(matchingIngredients.slice(0, 10), 'autocomplete');

            } else if (typingSegment.length === 0 && enteredIngredients.length > 0 && associationRulesData.length > 0) {
                // Case 2: Người dùng đã nhập ít nhất một nguyên liệu (enteredIngredients > 0)
                // VÀ phần đang gõ hiện tại là trống (typingSegment rỗng, có thể vừa gõ phẩy hoặc xóa hết sau phẩy)
                // Thực hiện Gợi ý từ luật kết hợp VÀ hiển thị trong DROPDOWN

                let suggestedConsequentsForDropdown = new Set(); // Gợi ý cho dropdown
                let relevantRulesForDropdown = associationRulesData.filter(rule => {
                    if (!rule.antecedents || rule.antecedents.length === 0) return false;
                    return enteredIngredients.some(inputIng =>
                        rule.antecedents.some(ruleAnt =>
                            ruleAnt.toLowerCase() === inputIng.toLowerCase()
                        )
                    );
                });

                // *** Sắp xếp luật liên quan cho dropdown theo Confidence và Lift ***
                relevantRulesForDropdown.sort((a, b) => {
                    if (b.confidence !== a.confidence) {
                        return b.confidence - a.confidence;
                    }
                    return b.lift - a.lift;
                });

                // Gom các CONSEQUENTS cho dropdown TỪ CÁC LUẬT ĐÃ SẮP XẾP VÀ LỌC
                let rankedSuggestionsForDropdown = [];
                const addedSuggestionsForDropdown = new Set();

                for (const rule of relevantRulesForDropdown) {
                    if (rule.consequents) {
                        for (const consequent of rule.consequents) {
                            const lowerCaseConsequent = consequent.toLowerCase();
                            if (!enteredIngredients.some(inputIng => inputIng.toLowerCase() === lowerCaseConsequent) && !addedSuggestionsForDropdown.has(lowerCaseConsequent)) {
                                rankedSuggestionsForDropdown.push(consequent);
                                addedSuggestionsForDropdown.add(lowerCaseConsequent);
                                if (rankedSuggestionsForDropdown.length >= 10) break;
                            }
                        }
                    }
                    if (rankedSuggestionsForDropdown.length >= 10) break;
                }

                displaySuggestionsDropdown(rankedSuggestionsForDropdown, 'association');
            }
            else {
                // Case 3: Phần đang gõ trống HOẶC quá ngắn (<1 ký tự) VÀ không có nguyên liệu nào được nhập
                // Ẩn dropdown
                hideSuggestionsDropdown();
            }
        });

        ingredientInput.addEventListener('blur', () => {
            setTimeout(hideSuggestionsDropdown, 100);
        });


        if (ingredientSuggestionsDropdown) {
            ingredientSuggestionsDropdown.addEventListener('click', (event) => {
                const clickedItem = event.target.closest('li');
                if (clickedItem && clickedItem.style.cursor !== 'default') {
                    const selectedIngredient = clickedItem.textContent.trim();

                    const currentValue = ingredientInput.value;
                    const lastCommaIndex = currentValue.lastIndexOf(',');

                    let newValue;
                    if (lastCommaIndex === -1) {
                        newValue = selectedIngredient + ', ';
                    } else {
                        const beforeComma = currentValue.substring(0, lastCommaIndex + 1);
                        newValue = beforeComma + selectedIngredient + ', ';
                    }
                    ingredientInput.value = newValue;

                    ingredientInput.focus();
                    ingredientInput.setSelectionRange(newValue.length, newValue.length);

                    hideSuggestionsDropdown();
                }
            });
        }

    } else {
        console.error("Ingredient input, suggestions dropdown, or data not ready!");
    }

    if (getSuggestionsButton) {
        getSuggestionsButton.addEventListener('click', () => {
            getSuggestions();
        });

        if (ingredientInput) {
            ingredientInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    getSuggestions();
                }
            });
        } else {
            console.error("Ingredient input #ingredientInput not found!");
        }
    } else {
        console.error("Suggestion button #getSuggestionsButton not found!");
    }

    function getSuggestions() {
        const input = ingredientInput.value.trim();
        const inputIngredients = input.split(',')
            .map(item => item.trim())
            .filter(item => item !== '');

        updateSuggestedIngredientsDisplay(inputIngredients);

        if (!inputIngredients || inputIngredients.length === 0) {
            if (suggestionResultsGrid) {
                suggestionResultsGrid.innerHTML = '<p class="col-12 text-center">Vui lòng nhập ít nhất một nguyên liệu để tìm kiếm công thức.</p>';
            }
            return;
        }

        if (!allRecipesData || allRecipesData.length === 0) {
            if (suggestionResultsGrid) {
                suggestionResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Dữ liệu công thức chưa sẵn sàng.</p>';
            }
            return;
        }

        const suggestedRecipes = allRecipesData.filter(recipe => {
            if (!recipe.ingredients || recipe.ingredients.length === 0) {
                return false;
            }
            const recipeIngredientsLower = recipe.ingredients.map(ing => ing.toLowerCase());

            return inputIngredients.every(inputIng =>
                recipeIngredientsLower.includes(inputIng.toLowerCase())
            );
        });

        if (suggestionResultsGrid) {
            suggestionResultsGrid.innerHTML = '';

            if (suggestedRecipes.length === 0) {
                suggestionResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào với các nguyên liệu này.</p>';
            } else {
                suggestedRecipes.forEach(recipe => {
                    const card = createRecipeCard(recipe);
                    suggestionResultsGrid.appendChild(card);
                });
            }
        }
    }

    if (suggestionResultsGrid) {
        suggestionResultsGrid.addEventListener('click', (event) => {
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
                    recipeModalTitle.textContent = `Món ăn #${fullRecipe.id}`;
                    const fullIngredientListHtml = fullRecipe.ingredients
                        .map(ingredient => `<li>${ingredient}</li>`)
                        .join('');
                    recipeModalBody.innerHTML = `<h6>Nguyên liệu:</h6><ul>${fullIngredientListHtml}</ul>`;

                    recipeModal.show();

                } else {
                    console.error(`Recipe with ID ${recipeId} not found in allRecipesData for results click.`);
                }
            }
        });
    } else {
        console.error("Suggestion results grid #suggestionResultsGrid not found! Cannot attach click listener.");
    }

    if (ingredientInput && ingredientSuggestionsDropdown) {
        Promise.all([fetchRecipes(), fetchAssociationRules(), fetchUniqueIngredients()])
            .then(([recipes, rules, uniqueIngs]) => {
                allRecipesData = recipes;
                associationRulesData = rules;
                uniqueIngredients = uniqueIngs;

                if (suggestionResultsGrid && suggestionResultsGrid.innerHTML === '') {
                    suggestionResultsGrid.innerHTML = '<p class="col-12 text-center">Nhập nguyên liệu bạn có và nhấn "Gợi ý ngay!".</p>';
                }
            })
            .catch(error => {
                console.error("Error loading initial data:", error);
                if (suggestionResultsGrid && suggestionResultsGrid.innerHTML === '') {
                    suggestionResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu cần thiết.</p>';
                }
            });
    } else {
        console.error("Essential elements (input or dropdown) not found! Data fetching skipped.");
        if (suggestionResultsGrid) {
            suggestionResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Lỗi khởi tạo trang.</p>';
        }
    }
});