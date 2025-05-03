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
         // Thêm các nguyên liệu khác bạn cảm thấy đặc trưng cho mùa nóng
    ];

    const coldSeasonIngredients = [
        "tỏi tây", "hạt bí ngô", "mỡ bò/cừu cứng", "cà rốt", "khoai tây làm bánh",
        "củ cải vàng", "đậu lăng nâu", "hạt nhục đậu khấu", "khoai lang", "đinh hương",
        "thịt gà tây", "táo granny smith", "nước ép táo lên men", "gừng tươi",
        "củ riềng", "hạt tiêu Tứ Xuyên", "cải thảo", "củ cải", "quả lê", "hạt tiêu Jamaica",
        "củ dền", "bắp cải savoia", "thịt bò hầm", "khoai tây nhiều tinh bột", "khoai tây",
        "đậu hà lan", "hạt thì là Ai Cập", "bạch đậu khấu", "ngũ vị hương" // Thêm ngũ vị hương
         // Thêm các nguyên liệu khác bạn cảm thấy đặc trưng cho mùa lạnh
    ];

    const hotSeasonIngredientsLower = hotSeasonIngredients.map(ing => ing.toLowerCase());
    const coldSeasonIngredientsLower = coldSeasonIngredients.map(ing => ing.toLowerCase());

    async function fetchRecipes() {
        try {
            const response = await fetch('./data/clean_DuLieu_vi.json'); // Đảm bảo đúng đường dẫn
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching recipes:', error);
             // Hiển thị thông báo lỗi fetch trên giao diện
            if (seasonalResultsGrid) {
                 seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn.</p>';
            }
            return [];
        }
    }

    // --- Hàm phân loại mùa cho một công thức ---
    // Dựa trên số lượng nguyên liệu đặc trưng của mùa nóng/lạnh
    function classifyRecipeSeasonal(recipe) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return 'Quanh năm'; // Hoặc 'Không xác định'
        }

        let hotScore = 0;
        let coldScore = 0;

        // Chuẩn hóa tên nguyên liệu của công thức về chữ thường để so sánh
        const recipeIngredientsLower = recipe.ingredients.map(ing => ing.toLowerCase());

        // Đếm điểm theo mùa
        recipeIngredientsLower.forEach(recipeIng => {
            if (hotSeasonIngredientsLower.includes(recipeIng)) {
                hotScore++;
            }
            if (coldSeasonIngredientsLower.includes(recipeIng)) {
                coldScore++;
            }
        });

        // Logic quyết định mùa
        // Ưu tiên mùa nào có điểm cao hơn và có ít nhất 1 nguyên liệu đặc trưng
        if (hotScore > coldScore && hotScore > 0) {
            return 'Mùa nóng';
        } else if (coldScore > hotScore && coldScore > 0) {
            return 'Mùa lạnh';
        } else {
            // Nếu điểm bằng nhau hoặc không có nguyên liệu đặc trưng nào
            return 'Quanh năm'; // Hoặc 'Hỗn hợp/Quanh năm'
        }
    }

    // Dùng để hiển thị kết quả tìm kiếm theo mùa
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.classList.add('recipe-card', 'card'); // Sử dụng lại style card từ style.css
        card.setAttribute('data-recipe-id', recipe.id); // Lưu ID món ăn vào data attribute

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const cardTitle = document.createElement('h5');
        cardTitle.classList.add('card-title'); // Sử dụng lại style card-title
        // Sử dụng tên món ăn nếu có, nếu không dùng ID
        cardTitle.textContent = recipe.name ? recipe.name : `Món ăn #${recipe.id}`;
        cardTitle.style.cursor = 'pointer'; // Cho biết có thể bấm vào tiêu đề

        const ingredientList = document.createElement('ul');
        ingredientList.classList.add('ingredient-list'); // Sử dụng lại style list

        const ingredients = recipe.ingredients || [];
        // Lấy tối đa 3 nguyên liệu để hiển thị trong card preview
        const ingredientsToShow = ingredients.slice(0, 3);

        ingredientsToShow.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient; // Chỉ hiển thị tên nguyên liệu
            ingredientList.appendChild(li);
        });

        // Thêm dấu "..." nếu món ăn có nhiều hơn 3 nguyên liệu
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

    // --- Hàm hiển thị các công thức trong grid ---
    // Hàm này nhận vào danh sách CÔNG THỨC ĐÃ ĐƯỢC LỌC, NGẪU NHIÊN HÓA VÀ GIỚI HẠN SỐ LƯỢNG
    function displayRecipes(recipesToDisplay) {
        if (!seasonalResultsGrid) return;

        seasonalResultsGrid.innerHTML = ''; // Xóa nội dung cũ

        if (!recipesToDisplay || recipesToDisplay.length === 0) {
            // Thông báo khi không tìm thấy món nào SAU KHI lọc và giới hạn
            // Thông báo cụ thể hơn sẽ nằm ở hàm filterAndDisplayBySeason nếu danh sách lọc ban đầu rỗng
            seasonalResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào.</p>';
            return;
        }

        recipesToDisplay.forEach(recipe => {
            const card = createRecipeCard(recipe);
            seasonalResultsGrid.appendChild(card);
        });
    }

    function shuffleArray(array) {
        // Tạo một bản sao của mảng để không làm thay đổi mảng gốc (allRecipesData)
        const shuffledArray = [...array];
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // Chọn một chỉ mục ngẫu nhiên từ 0 đến i
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Hoán đổi phần tử tại i và j
        }
        return shuffledArray; // Trả về mảng đã xáo trộn
    }

    function filterAndDisplayBySeason(selectedSeason) {
        if (!allRecipesData || allRecipesData.length === 0) {
             console.warn("Recipe data not loaded yet for seasonal filtering.");
             displayRecipes([]); // Hiển thị trống hoặc thông báo lỗi tải
             return;
        }

        console.log(`Filtering recipes for season: ${selectedSeason}`);

        // Bước 1: Lọc danh sách công thức dựa trên hàm phân loại mùa
        const filteredRecipes = allRecipesData.filter(recipe => {
            const recipeSeason = classifyRecipeSeasonal(recipe);
            // So sánh nhãn mùa trả về với mùa được chọn
             if (selectedSeason === 'Quanh năm' && recipeSeason === 'Quanh năm') return true;
             if (selectedSeason === 'Mùa nóng' && recipeSeason === 'Mùa nóng') return true;
             if (selectedSeason === 'Mùa lạnh' && recipeSeason === 'Mùa lạnh') return true;
             // Xử lý các nhãn khác nếu cần, ví dụ 'Hỗn hợp/Quanh năm'
             if (selectedSeason === 'Quanh năm' && recipeSeason === 'Hỗn hợp/Quanh năm') return true; // Thêm món hỗn hợp vào mục Quanh năm
             // if (selectedSeason === 'Mùa nóng' && recipeSeason === 'Hỗn hợp/Quanh năm') return true; // Thêm món hỗn hợp vào mục Mùa nóng
             // if (selectedSeason === 'Mùa lạnh' && recipeSeason === 'Hỗn hợp/Quanh năm') return true; // Thêm món hỗn hợp vào mục Mùa lạnh

            return false; // Không khớp
        });

        // Kiểm tra nếu không tìm thấy món nào sau khi lọc
        if (filteredRecipes.length === 0) {
            if (seasonalResultsGrid) {
                 seasonalResultsGrid.innerHTML = `<p class="col-12 text-center">Không tìm thấy công thức nào phù hợp với mùa "${selectedSeason}" trong dữ liệu.</p>`;
            }
            return; // Dừng, không cần ngẫu nhiên hay hiển thị
        }


        // Bước 2: Ngẫu nhiên hóa danh sách đã lọc
        const shuffledRecipes = shuffleArray(filteredRecipes);

        // Bước 3: Chọn ra tối đa 6 món từ danh sách đã ngẫu nhiên hóa
        const recipesToDisplay = shuffledRecipes.slice(0, 5); // Lấy 6 món đầu tiên


        // Bước 4: Hiển thị 6 món đã chọn
        displayRecipes(recipesToDisplay); // Hàm displayRecipes giờ chỉ cần hiển thị danh sách được truyền vào
    }

    if (seasonalResultsGrid && seasonButtons && seasonButtons.length > 0) {
        // Hiển thị thông báo tải dữ liệu ban đầu
        seasonalResultsGrid.innerHTML = '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>';

       fetchRecipes()
           .then(recipes => {
               // >>> DATA ĐÃ TẢI XONG THÀNH CÔNG <<<
               allRecipesData = recipes;

               // Xóa thông báo tải dữ liệu
                if (seasonalResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>') {
                    seasonalResultsGrid.innerHTML = '';
                }

               // --- GẮN CÁC EVENT LISTENERS SAU KHI DATA ĐÃ TẢI XONG ---

               // Listener cho các nút chọn mùa (sử dụng Event Delegation trên season-selector nếu có nhiều nút)
               // Cách hiện tại duyệt qua từng nút cũng ổn nếu số lượng nút ít
               seasonButtons.forEach(button => {
                   button.addEventListener('click', () => {
                       const selectedSeason = button.getAttribute('data-season');
                       if (selectedSeason) {
                            // Loại bỏ class 'active' khỏi tất cả các nút
                            seasonButtons.forEach(btn => btn.classList.remove('active'));
                            // Thêm class 'active' vào nút vừa bấm (để làm nổi bật nút đang chọn)
                            button.classList.add('active');

                           filterAndDisplayBySeason(selectedSeason); // Lọc, ngẫu nhiên, giới hạn và hiển thị
                       }
                   });
               });

               // Listener cho CONTAINER KẾT QUẢ (Event Delegation cho click card title -> modal)
               // Listener này cần được gắn sau khi seasonalResultsGrid đã được đảm bảo tồn tại (bên ngoài if này)
               // hoặc kiểm tra lại seasonalResultsGrid bên trong listener

               // --> Listener này đã được đặt bên ngoài Promise.all block trong code trước,
               //     chúng ta sẽ giữ nó ở đó nhưng đảm bảo nó chỉ xử lý khi allRecipesData đã có.
               //     Hoặc di chuyển nó vào đây nếu muốn chắc chắn data đã load.
               //     Để đơn giản, ta sẽ di chuyển nó vào đây.


               // --- Gắn Listener click cho CONTAINER KẾT QUẢ (Event Delegation cho click card title -> modal) ---
               if (seasonalResultsGrid) { // Kiểm tra lại mặc dù đã kiểm tra bên ngoài
                    seasonalResultsGrid.addEventListener('click', (event) => {
                       const clickedTitleElement = event.target.closest('.card-title');

                       if (clickedTitleElement) {
                           // debugger; // Giữ debugger nếu cần gỡ lỗi

                           const cardElement = clickedTitleElement.closest('.recipe-card');
                           if (!cardElement) {
                               console.error("Could not find parent card element for clicked title in results.");
                               return;
                           }

                           const recipeId = cardElement.getAttribute('data-recipe-id');

                           // Kiểm tra xem modal đã sẵn sàng và dữ liệu đã tải chưa
                           // allRecipesData đã chắc chắn có ở scope này
                           if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                               console.error("Modal not ready or recipe data not loaded for results click!");
                               return;
                           }

                           // Tìm công thức đầy đủ trong dữ liệu đã tải
                           const fullRecipe = allRecipesData.find(r => r.id == recipeId);

                           if (fullRecipe) {
                               // Cập nhật nội dung modal
                               recipeModalTitle.textContent = fullRecipe.name ? fullRecipe.name : `Món ăn #${fullRecipe.id}`; // Sử dụng tên món ăn
                               const fullIngredientListHtml = fullRecipe.ingredients
                                   .map(ingredient => `<li>${ingredient}</li>`)
                                   .join('');
                               recipeModalBody.innerHTML = `<h6>Nguyên liệu:</h4><ul>${fullIngredientListHtml}</ul>`; // Sử dụng h6

                               // Hiển thị modal
                               recipeModal.show();

                           } else {
                               console.error(`Recipe with ID ${recipeId} not found in allRecipesData.`);
                           }
                       }
                   });
               } else {
                    console.error("Seasonal results grid #seasonalResultsGrid not found! Cannot attach click listener for modal.");
               }


               // Tùy chọn: Hiển thị công thức của một mùa mặc định khi trang load xong (ví dụ: Quanh năm)
               // Tìm và kích hoạt nút "Quanh năm" để hiển thị mặc định
                const defaultSeasonButton = document.querySelector('.season-selector .btn[data-season="Quanh năm"]');
                if(defaultSeasonButton) {
                    
                } else {
                    // Nếu không có nút Quanh năm hoặc không tìm thấy, hiển thị trống hoặc thông báo
                     if (seasonalResultsGrid && seasonalResultsGrid.innerHTML === '') { // Kiểm tra lại seasonalResultsGrid
                          seasonalResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một mùa để xem thực đơn.</p>';
                     }
                }


           }) // Kết thúc then fetchRecipes
           .catch(error => {
               // >>> XẢY RA LỖI KHI TẢI DATA <<<
               console.error("Error loading initial recipe data:", error);
               if (seasonalResultsGrid && seasonalResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu món ăn...</p>') {
                    seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu món ăn cần thiết.</p>';
               }
           }); // Kết thúc catch fetchRecipes

   } else {
       // >>> KHÔNG TÌM THẤY CÁC PHẦN TỬ DOM CẦN THIẾT <<<
       console.error("Essential DOM elements (results grid or season buttons) not found! Data fetching skipped.");
       if (seasonalResultsGrid) {
            seasonalResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Lỗi khởi tạo trang: Không tìm thấy các phần tử cần thiết trên DOM.</p>';
       }
   }
});