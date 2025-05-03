document.addEventListener('DOMContentLoaded', () => {
    const cardsContainer = document.getElementById('recipeCardsContainer');
    const cardWidth = 250; // Phải khớp với chiều rộng card trong CSS
    const cardMarginRight = 15; // Phải khớp với margin-right trong CSS
    const numberOfRandomRecipes = 10; // Số lượng card ngẫu nhiên muốn hiển thị

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
    // Kiểm tra xem phần tử modal có tồn tại không trước khi khởi tạo
    let recipeModal = null;
    if (recipeModalElement) {
       // Khởi tạo đối tượng Modal của Bootstrap
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
        // Tạo bản sao trước khi xáo trộn nếu không muốn ảnh hưởng mảng gốc (tùy chọn)
        const recipesCopy = [...recipes];
        const shuffled = recipesCopy.sort(() => 0.5 - Math.random()); // Xáo trộn ngẫu nhiên
        return shuffled.slice(0, n); // Lấy N phần tử đầu tiên
    }

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.classList.add('recipe-card', 'card');
        card.setAttribute('data-recipe-id', recipe.id); // Lưu ID vào data attribute

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        // Đưa tiêu đề Món ăn #ID vào một thẻ có thể bấm được (hoặc click sự kiện trên card)
        // Gắn sự kiện click vào toàn bộ card để dễ bấm hơn
        // Đặt cursor pointer trong CSS để người dùng biết nó bấm được

        const cardTitle = document.createElement('h5');
        cardTitle.classList.add('card-title');
        cardTitle.textContent = `Món ăn #${recipe.id}`;

        const ingredientList = document.createElement('ul');
        ingredientList.classList.add('ingredient-list');

        const ingredients = recipe.ingredients || [];
        const ingredientsToShow = ingredients.slice(0, 3); // Lấy tối đa 3 nguyên liệu

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
        // Tính toán tổng chiều rộng của TẤT CẢ các card đã được thêm vào DOM + margin
        let totalContentWidth = 0;
        container.querySelectorAll('.recipe-card').forEach(card => {
            totalContentWidth += card.offsetWidth + cardMarginRight;
        });

        // Đặt chiều rộng của container cuộn để chứa hết các card
        container.style.width = `${totalContentWidth}px`;

        // Nhân đôi nội dung container để tạo hiệu ứng cuộn vô hạn mượt mà
        // Cần tạo một bản sao của tất cả các card VÀ thêm chúng vào container
        const cards = container.innerHTML;
        container.innerHTML += cards; // Thêm bản sao nội dung ban đầu

        // Tính toán khoảng cách cuộn thực tế (chiều rộng của tập hợp card ban đầu)
        // Lưu ý: offsetWidth đã bao gồm border và padding, nhưng không bao gồm margin
        // Chúng ta cần cuộn một khoảng bằng tổng chiều rộng của tập hợp card ban đầu + margin giữa chúng
        const scrollDistance = totalContentWidth;

        // Tính toán thời gian animation dựa trên tổng chiều rộng (để tốc độ tương đối cố định)
        // Giả định tốc độ khoảng 50px/s. Thời gian = Khoảng cách / Tốc độ
        const animationDuration = (scrollDistance / 50); // Giây

        // Gán biến CSS cho khoảng cách cuộn trong keyframes
        container.style.setProperty('--scroll-distance', `-${scrollDistance}px`); // Âm vì cuộn sang trái

        container.style.setProperty('animation-duration', `${animationDuration}s`);
    }

    if (cardsContainer) { // Kiểm tra container tồn tại trước khi gắn listener
        cardsContainer.addEventListener('click', (event) => {
            // Sử dụng event.target.closest để kiểm tra xem click có trúng vào .card-title (hoặc con của nó) không
            const clickedTitleElement = event.target.closest('.card-title');

            if (clickedTitleElement) {

                // Tìm phần tử card cha để lấy ID
                const cardElement = clickedTitleElement.closest('.recipe-card');
                if (!cardElement) {
                    return;
                }

                const recipeId = cardElement.getAttribute('data-recipe-id');

                 // Kiểm tra xem modal đã được khởi tạo thành công chưa và có dữ liệu món ăn không
                if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                    // Có thể hiển thị thông báo cho người dùng nếu dữ liệu chưa sẵn sàng
                    return;
                }

                const fullRecipe = allRecipesData.find(r => r.id == recipeId);

                if (fullRecipe) {

                    // Cập nhật nội dung modal
                    recipeModalTitle.textContent = `Món ăn #${fullRecipe.id}`;

                    const fullIngredientListHtml = fullRecipe.ingredients
                        .map(ingredient => `<li>${ingredient}</li>`)
                        .join('');
                    recipeModalBody.innerHTML = `<h6>Nguyên liệu:</h6><ul>${fullIngredientListHtml}</ul>`;

                    // Hiển thị modal
                    recipeModal.show();

                } else {
                    console.error(`Recipe with ID ${recipeId} not found in allRecipesData.`);
                }

            }
            // Nếu click không trúng .card-title, handler này sẽ không làm gì cả
        });
    } else {
       console.error("Cards container #recipeCardsContainer not found! Cannot attach click listener.");
    }

    fetchRecipes().then(recipes => {
        allRecipesData = recipes;
        const randomRecipes = getRandomRecipes(recipes, numberOfRandomRecipes);

        if (randomRecipes.length === 0) {
             // Đã xử lý thông báo lỗi khi fetch thất bại,
             // Thêm xử lý nếu fetch thành công nhưng danh sách rỗng hoặc chọn ngẫu nhiên ra 0 món
             if(cardsContainer.innerHTML === '') { // Tránh ghi đè thông báo lỗi fetch
                 cardsContainer.innerHTML = '<p class="col-12 text-center">Không tìm thấy món ăn nào để hiển thị.</p>';
             }
             return;
        }

        // Xóa nội dung cũ trước khi thêm card mới (nếu có)
        cardsContainer.innerHTML = '';

        randomRecipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            cardsContainer.appendChild(card);
        });

         // Thiết lập animation sau khi đã thêm các card vào DOM
         // Cần gọi setupScrollAnimation SAU KHI các card đã được thêm vào và render
         // để offsetWidth tính toán đúng.
         // Sử dụng setTimeout nhỏ để đảm bảo DOM đã cập nhật
         setTimeout(setupScrollAnimation, 50); // Chờ 50ms để đảm bảo render
    });
});