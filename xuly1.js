document.addEventListener('DOMContentLoaded', () => {
    const clusterSelect = document.getElementById('clusterSelect'); // Dropdown chọn cụm
    const moreClusterRecipesButton = document.getElementById('moreClusterRecipesButton'); // Nút hiển thị thêm (giờ là Hiển thị ngẫu nhiên khác)
    const clusterRecipeCountInfo = document.getElementById('clusterRecipeCountInfo'); // Khu vực thông tin số lượng
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

    let allRecipesData = []; // Dữ liệu công thức đầy đủ
    let recipeClustersData = [];

    let currentClusterRecipeIds = []; // Danh sách ID đầy đủ của cụm hiện tại
    const recipesPerDisplay = 20;

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
            // Giả định cấu trúc là {"cluster_id": [recipe_id1, recipe_id2, ...]}
            // Nếu cấu trúc khác, cần xử lý lại ở đây để có được ánh xạ mong muốn
            return data; // Lưu dữ liệu cụm theo cấu trúc file JSON
        } catch (error) {
            console.error('Error fetching recipe cluster data:', error);
            return {}; // Trả về object rỗng nếu lỗi
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
             clusterRecipeCountInfo.textContent = ''; // Trống nếu chưa chọn cụm
        } else if (totalRecipes === 0) {
             clusterRecipeCountInfo.textContent = `Nhóm ${selectedCluster} không có món ăn nào.`;
        }
        else {
             clusterRecipeCountInfo.textContent = `Tổng số món trong nhóm ${selectedCluster}: ${totalRecipes}.`;
        }
    }

    function shuffleArray(array) {
        const shuffledArray = [...array]; // Tạo bản sao
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

       // Xóa nội dung cũ trước khi hiển thị bộ mới
       clusterResultsGrid.innerHTML = '';

        if (!currentClusterRecipeIds || currentClusterRecipeIds.length === 0) {
            clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào trong cụm này.</p>';
            updateCountInfo(); // Cập nhật thông tin số lượng
            return;
        }

       // Ngẫu nhiên hóa danh sách ID của cụm hiện tại
       const shuffledIds = shuffleArray(currentClusterRecipeIds);

       // Lấy 20 ID đầu tiên từ danh sách đã ngẫu nhiên hóa
       const recipeIdsToDisplay = shuffledIds.slice(0, recipesPerDisplay);


       // Tìm các công thức đầy đủ từ allRecipesData dựa trên các ID đã chọn
       const recipesToDisplay = recipeIdsToDisplay
           .map(id => allRecipesData.find(recipe => recipe.id === id))
           .filter(recipe => recipe !== undefined);


        if (recipesToDisplay.length === 0 && recipeIdsToDisplay.length > 0) {
             console.warn("Could not find full recipe details for any IDs in the random sample batch.");
              clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Không tìm thấy công thức nào trong cụm này (có thể do lỗi dữ liệu).</p>';
             updateCountInfo();
            return;
        }

        // Hiển thị các công thức đã tìm thấy
        recipesToDisplay.forEach(recipe => {
            const card = createRecipeCard(recipe);
            clusterResultsGrid.appendChild(card);
        });

        updateCountInfo(); // Cập nhật thông tin số lượng sau khi hiển thị

        // Kích hoạt nút "Hiển thị thêm" nếu cụm có nhiều hơn 0 món
        if (currentClusterRecipeIds.length > 0) {
             moreClusterRecipesButton.disabled = false;
        } else {
             moreClusterRecipesButton.disabled = true;
        }
    }

    if (clusterSelect && moreClusterRecipesButton && clusterRecipeCountInfo && clusterResultsGrid) {
         // Hiển thị thông báo tải dữ liệu ban đầu
         clusterResultsGrid.innerHTML = '<p class="col-12 text-center text-muted">Đang tải dữ liệu...</p>';
         updateCountInfo(); // Cập nhật thông báo số lượng (sẽ hiển thị trống)

         // Tạm thời vô hiệu hóa dropdown và nút trong lúc tải
         clusterSelect.disabled = true;
         moreClusterRecipesButton.disabled = true;


        Promise.all([fetchRecipes(), fetchRecipeClusters()])
            .then(([recipes, clusters]) => {
                allRecipesData = recipes;
                recipeClustersData = clusters;

                // Xóa thông báo tải dữ liệu
                 if (clusterResultsGrid.innerHTML === '<p class="col-12 text-center text-muted">Đang tải dữ liệu...</p>') {
                     clusterResultsGrid.innerHTML = '';
                 }

                // Kích hoạt lại dropdown
                clusterSelect.disabled = false;
                // Nút hiển thị thêm vẫn disabled cho đến khi chọn cụm

                // Hiển thị thông báo ban đầu sau khi tải xong
                 if (clusterResultsGrid.innerHTML === '') {
                      clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một cụm từ danh sách để xem các món ăn tương đồng.</p>';
                      updateCountInfo(); // Cập nhật thông tin số lượng
                 }


                // *** GẮN CÁC EVENT LISTENERS SAU KHI DATA ĐÃ TẢI XONG ***

                // Listener cho Dropdown chọn cụm
                clusterSelect.addEventListener('change', (event) => {
                    const selectedCluster = event.target.value; // Lấy giá trị cụm (là chuỗi '1', '2', ...)

                    // Xóa kết quả cũ
                    clusterResultsGrid.innerHTML = '';
                    // Reset biến trạng thái của cụm hiện tại
                    currentClusterRecipeIds = [];
                    moreClusterRecipesButton.disabled = true; // Mặc định vô hiệu hóa nút

                    if (selectedCluster === "") {
                        // Nếu chọn lại mục "Chọn cụm"
                        clusterResultsGrid.innerHTML = '<p class="col-12 text-center">Chọn một cụm từ danh sách để xem các món ăn tương đồng.</p>';
                        updateCountInfo(); // Cập nhật thông tin số lượng
                        return;
                    }

                    const clusterIndex = parseInt(selectedCluster) - 1;

                    const recipesInSelectedClusterObjects = recipeClustersData.filter(item => {
                        // Kiểm tra xem item có tồn tại và có trường 'cluster' là số không
                        return item && typeof item.cluster === 'number' && item.cluster === clusterIndex;
                    });

                    // Lấy danh sách ID công thức cho cụm đã chọn
                    // Đảm bảo rằng recipeClustersData[selectedCluster] là một mảng
                    const recipeIdsInCluster = recipesInSelectedClusterObjects.map(item => item.id);
                    //console.log(`Found ${recipeIdsInCluster.length} recipes in cluster ${selectedCluster}.`);

                    // Lưu danh sách ID đầy đủ của cụm vào biến trạng thái
                    currentClusterRecipeIds = recipeIdsInCluster;

                    // Hiển thị lô món ngẫu nhiên đầu tiên
                    displayRandomSample(); // Hàm này sẽ xóa grid và hiển thị 20 món ngẫu nhiên

                });

                // Listener cho nút "Hiển thị thêm" (giờ là "Hiển thị ngẫu nhiên khác")
                 moreClusterRecipesButton.addEventListener('click', () => {
                     displayRandomSample(); // Hiển thị một bộ món ngẫu nhiên khác
                 });


                // Listener cho CONTAINER KẾT QUẢ (Event Delegation cho click card title -> modal)
                 if (clusterResultsGrid) { // Kiểm tra lại
                     console.log("Attaching click listener to cluster results grid for modal.");
                     clusterResultsGrid.addEventListener('click', (event) => {
                        const clickedTitleElement = event.target.closest('.card-title');

                        if (clickedTitleElement) {
                            // debugger; // Giữ debugger nếu cần gỡ lỗi

                            const cardElement = clickedTitleElement.closest('.recipe-card');
                            if (!cardElement) {
                                console.error("Could not find parent card element for clicked title in results.");
                                return;
                            }

                            const recipeId = parseInt(cardElement.getAttribute('data-recipe-id')); // Chuyển ID sang số

                            // allRecipesData đã chắc chắn có ở scope này
                            if (!recipeModal || !recipeModalTitle || !recipeModalBody || !allRecipesData || allRecipesData.length === 0) {
                                console.error("Modal not ready or recipe data not loaded for results click!");
                                return;
                            }

                            // Tìm công thức đầy đủ trong dữ liệu đã tải (dựa trên ID số)
                            const fullRecipe = allRecipesData.find(r => r.id === recipeId); // So sánh bằng ===

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
                     console.error("Cluster results grid #clusterResultsGrid not found! Cannot attach click listener for modal.");
                }


            }) // <<< Kết thúc then Promise.all ở ĐÂY
            .catch(error => {
                // >>> XẢY RA LỖI KHI TẢI DATA <<<
                console.error("Error loading initial data for cluster page:", error);
                 // Hiển thị thông báo lỗi trên giao diện chính
                if (clusterResultsGrid) {
                     clusterResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Không thể tải dữ liệu cần thiết.</p>';
                }
                // Vô hiệu hóa dropdown và nút nếu tải lỗi
                if (clusterSelect) clusterSelect.disabled = true;
                if (moreClusterRecipesButton) moreClusterRecipesButton.disabled = true;
                updateCountInfo(); // Cập nhật thông tin số lượng (sẽ hiển thị lỗi)
            }); // <<< Kết thúc catch Promise.all ở ĐÂY


    } else {
        // >>> KHÔNG TÌM THẤY CÁC PHẦN TỬ DOM CẦN THIẾT <<<
        console.error("Essential DOM elements (cluster select or results grid) not found! Data fetching skipped.");
        if (clusterResultsGrid) {
             clusterResultsGrid.innerHTML = '<p class="text-danger col-12 text-center">Lỗi khởi tạo trang: Không tìm thấy các phần tử cần thiết trên DOM.</p>';
        }
         // Vô hiệu hóa nút nếu các phần tử không tồn tại
         if (moreClusterRecipesButton) moreClusterRecipesButton.disabled = true;
         updateCountInfo(); // Cập nhật thông tin số lượng (sẽ hiển thị lỗi)
    }
});