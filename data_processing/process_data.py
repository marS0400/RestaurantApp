import json
import re
import pandas as pd # type: ignore
import os
import random
from sklearn.cluster import KMeans # type: ignore
from mlxtend.frequent_patterns import apriori, association_rules # type: ignore
from mlxtend.preprocessing import TransactionEncoder # type: ignore
# import joblib # Có thể dùng để lưu/load model K-means nếu cần

# --- Định nghĩa các đường dẫn file ---
DATA_DIR = "data"
INPUT_FILE_PATH = os.path.join(DATA_DIR, "DuLieu.json") # File JSON gốc (tiếng Anh)
CLEANED_FILE_PATH = os.path.join(DATA_DIR, "clean_DuLieu_vi.json") # Dữ liệu đã làm sạch (tiếng Việt)
UNIQUE_INGREDIENTS_FILE_PATH_FOR_MAPPING = os.path.join(DATA_DIR, "unique_ingredients_for_mapping.txt") # Dùng sau lần chạy đầu để xem các tên cần map
# Thêm file để lưu kết quả K-means và Luật kết hợp (sẽ chứa tên tiếng Việt)
KMEANS_CLUSTERS_FILE_PATH = os.path.join(DATA_DIR, "recipe_clusters_vi.json")
ASSOCIATION_RULES_FILE_PATH = os.path.join(DATA_DIR, "association_rules_vi.json")
# File để lưu danh sách nguyên liệu duy nhất đã được chuẩn hóa (tiếng Việt)
UNIQUE_INGREDIENTS_LIST_FILE_PATH = os.path.join(DATA_DIR, "unique_ingredients_list_vi.json")

# --- Định nghĩa đường dẫn file cho các bản đồ (map) ---
EN_STANDARDIZATION_MAP_PATH = os.path.join(DATA_DIR, "en_standardization_map.json")
EN_TO_VI_MAP_PATH = os.path.join(DATA_DIR, "en_to_vi_map.json")

# --- Hàm hỗ trợ tải bản đồ từ file JSON ---
def load_map_from_json(filepath, default_map=None):
    """Tải bản đồ từ file JSON. Trả về bản đồ rỗng hoặc mặc định nếu file không tồn tại hoặc lỗi."""
    if not os.path.exists(filepath):
        print(f"Map file not found: {filepath}. Creating with default content.")
        map_to_save = default_map if default_map is not None else {}
        try:
            output_dir = os.path.dirname(filepath)
            if output_dir and not os.path.exists(output_dir):
                 os.makedirs(output_dir)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(map_to_save, f, indent=4, ensure_ascii=False)
            print(f"Created initial map file: {filepath}")
            return map_to_save
        except IOError as e:
             print(f"Error creating default map file {filepath}: {e}. Returning empty map.")
             return {}

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from map file {filepath}: {e}. Returning empty map.")
        return {}
    except IOError as e:
        print(f"Error reading map file {filepath}: {e}. Returning empty map.")
        return {}

# --- Định nghĩa các bản đồ mặc định (dùng để tạo file lần đầu nếu chưa có) ---
# BẠN CÓ THỂ THÊM/SỬA TRỰC TIẾP CÁC FILE JSON TẠO RA THAY VÌ SỬA Ở ĐÂY SAU LẦN CHẠY ĐẦU
DEFAULT_EN_STANDARDIZATION_MAP = {
    
    # ... thêm các biến thể tiếng Anh khác
}

DEFAULT_EN_TO_VI_MAP = {
    
    # ... thêm các nguyên liệu khác
}


# --- 1. Data Cleaning Function (Sử dụng bản đồ được tải) ---
def clean_ingredient_name(ingredient, en_standardization_map, en_to_vi_map):
    """
    Chuẩn hóa tên nguyên liệu: làm sạch sơ bộ tiếng Anh -> chuẩn hóa tiếng Anh -> chuyển sang tiếng Việt.
    Sử dụng bản đồ được truyền vào.
    """
    if not isinstance(ingredient, str):
        return None # Loại bỏ dữ liệu không hợp lệ

    ingredient = ingredient.lower().strip()

    # --- BƯỚC MỚI: Loại bỏ các phần không phải tên nguyên liệu cốt lõi ---
    # Đây là nơi bạn cần thêm logic. Ví dụ sơ bộ (cần được mở rộng và kiểm tra kỹ):
    ingredient = re.sub(r'\s*\(\s*.*\s*\)', '', ingredient) # Bỏ phần trong ngoặc đơn
    ingredient = re.sub(r'\d+%?\s*low-fat|\d+%?\s*reduced-fat|\d+%?\s*lean|\d+%?\s*less sodium', '', ingredient) # Bỏ các mô tả về hàm lượng/chất béo/sodium/lean
    ingredient = re.sub(r'\b(oz|ounce|pound|cup|tsp|tbsp)s?\b', '', ingredient) # Bỏ các đơn vị đo lường phổ biến (cần list đầy đủ hơn)
    ingredient = ingredient.replace('cooked', '').replace('diced', '').replace('quick rise', '').replace('activ dry', 'active dry') # Bỏ các trạng thái/mô tả (cần list đầy đủ)
    ingredient = ingredient.replace('alaskan', '').replace('albacore in water', '').replace('american long grain', '') # Bỏ các mô tả nguồn gốc/loại cụ thể (cần list đầy đủ)
    # Có thể cần thêm logic cho 'and', 'with', 'style', etc.

    ingredient = ingredient.strip() # Làm sạch lại sau khi loại bỏ

    # Bước 1: Chuẩn hóa các biến thể trong tiếng Anh về dạng chuẩn tiếng Anh
    # Sử dụng bản đồ được tải
    standardized_en_ingredient = en_standardization_map.get(ingredient, ingredient)

    # Bước 2: Chuyển từ tiếng Anh chuẩn hóa sang tiếng Việt
    # Sử dụng bản đồ được tải. Nếu không tìm thấy trong map tiếng Việt, giữ nguyên tên tiếng Anh đã chuẩn hóa
    cleaned_ingredient_vi = en_to_vi_map.get(standardized_en_ingredient, standardized_en_ingredient)

    # Có thể thêm bước làm sạch cuối cùng cho tiếng Việt nếu cần
    cleaned_ingredient_vi = cleaned_ingredient_vi.strip()

    # Loại bỏ các nguyên liệu rỗng hoặc chỉ chứa khoảng trắng sau khi làm sạch
    if not cleaned_ingredient_vi:
        return None

    return cleaned_ingredient_vi

# --- 2. Load, Clean, and Save Data Function (Truyền bản đồ vào) ---
def load_clean_and_save_data(input_filepath, cleaned_output_filepath, unique_ingredients_list_filepath_vi, unique_ingredients_for_mapping_filepath_txt, en_standardization_map, en_to_vi_map):
    """
    Tải, làm sạch (bao gồm chuẩn hóa tiếng Việt), loại bỏ trùng lặp, và lưu dữ liệu sạch cùng danh sách nguyên liệu duy nhất (tiếng Việt).
    Nhận các bản đồ làm sạch và dịch làm tham số.
    """
    print(f"--- Loading and Cleaning Data ---")
    print(f"Loading data from: {input_filepath}")
    try:
        with open(input_filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_filepath}")
        return None, None
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {input_filepath}. Please check file format.")
        return None, None

    cleaned_data = []
    all_cleaned_ingredients_vi = set()

    print(f"Processing {len(data)} potential records...")
    for i, recipe in enumerate(data):
        if (i + 1) % 10000 == 0:
            print(f"Processed {i + 1}/{len(data)} records...")

        cleaned_ingredients_vi = []
        if "ingredients" in recipe and isinstance(recipe["ingredients"], list):
            for ingredient in recipe["ingredients"]:
                # Sử dụng hàm làm sạch mới và truyền bản đồ vào
                cleaned_ingredient = clean_ingredient_name(ingredient, en_standardization_map, en_to_vi_map)
                if cleaned_ingredient is not None:
                    cleaned_ingredients_vi.append(cleaned_ingredient)

            # Loại bỏ trùng lặp nguyên liệu trong cùng một món (sau khi làm sạch)
            cleaned_ingredients_vi = list(set(cleaned_ingredients_vi))
            all_cleaned_ingredients_vi.update(cleaned_ingredients_vi)

        # Lưu lại dữ liệu đã làm sạch cho món ăn (có thể bao gồm cả những món không có nguyên liệu sau khi làm sạch)
        cleaned_data.append({
            "id": recipe.get("id"),
            "ingredients": cleaned_ingredients_vi # Danh sách nguyên liệu có thể rỗng nếu tất cả bị loại bỏ
        })

    # --- Xử lý trùng lặp món ăn (chỉ xử lý các món CÒN nguyên liệu sau khi làm sạch) ---
    # Tạo DataFrame từ dữ liệu đã làm sạch
    df_cleaned = pd.DataFrame(cleaned_data)

    # Chỉ xét các món còn nguyên liệu để loại bỏ trùng lặp
    df_with_ingredients = df_cleaned[df_cleaned['ingredients'].apply(lambda x: len(x) > 0)].copy()
    df_without_ingredients = df_cleaned[df_cleaned['ingredients'].apply(lambda x: len(x) == 0)].copy()

    df_with_ingredients['ingredients_str'] = df_with_ingredients['ingredients'].apply(lambda x: '_'.join(sorted(x))) # Sort để so sánh

    initial_count_with_ingredients = len(df_with_ingredients)
    df_deduplicated_with_ingredients = df_with_ingredients.drop_duplicates(subset=['ingredients_str']).drop(columns=['ingredients_str'])
    deduplicated_count = len(df_deduplicated_with_ingredients)

    # Kết hợp lại các món đã khử trùng lặp và các món không có nguyên liệu
    cleaned_data_deduplicated = pd.concat([df_deduplicated_with_ingredients, df_without_ingredients], ignore_index=True)
    cleaned_data_deduplicated = cleaned_data_deduplicated.to_dict('records')


    print(f"Finished cleaning and deduplicating.")
    print(f"Loaded {initial_count_with_ingredients + len(df_without_ingredients)} initial records.")
    print(f"Processed {initial_count_with_ingredients} records with ingredients, found {deduplicated_count} unique among them.")
    print(f"Resulting in {len(cleaned_data_deduplicated)} total records (including those without ingredients).")

    unique_ingredients_list_vi = sorted(list(all_cleaned_ingredients_vi))
    print(f"Found {len(unique_ingredients_list_vi)} unique cleaned ingredients (mostly Vietnamese).")

    # --- Lưu dữ liệu đã làm sạch và danh sách nguyên liệu duy nhất ---
    print(f"Saving cleaned data to: {cleaned_output_filepath}")
    print(f"Saving unique ingredients list (JSON) to: {unique_ingredients_list_filepath_vi}")
    print(f"Saving unique ingredients list (TXT for review) to: {unique_ingredients_for_mapping_filepath_txt}")
    try:
        output_dir = os.path.dirname(cleaned_output_filepath)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"Created directory: {output_dir}")

        with open(cleaned_output_filepath, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data_deduplicated, f, indent=4, ensure_ascii=False)

        with open(unique_ingredients_list_filepath_vi, 'w', encoding='utf-8') as f:
             json.dump(unique_ingredients_list_vi, f, indent=4, ensure_ascii=False)

        with open(unique_ingredients_for_mapping_filepath_txt, 'w', encoding='utf-8') as f:
            for ingredient in unique_ingredients_list_vi:
                f.write(f"{ingredient}\n")


        print("Saving complete.")
    except IOError as e:
        print(f"Error: Could not write output files. {e}")

    return cleaned_data_deduplicated, unique_ingredients_list_vi


# --- 3. Prepare Data for Clustering ---
def prepare_data_for_clustering(cleaned_recipes, unique_ingredients_vi):
    """
    Chuẩn bị dữ liệu cho K-means: tạo vector nhị phân (Bag of Ingredients)
    dưới dạng pandas DataFrame.
    unique_ingredients_vi là danh sách nguyên liệu duy nhất bằng tiếng Việt.
    Chỉ sử dụng các món có ít nhất một nguyên liệu.
    """
    print(f"\n--- Preparing Data for Clustering ---")

    # Lọc chỉ lấy các món có nguyên liệu
    recipes_with_ingredients = [r for r in cleaned_recipes if r.get('ingredients') and len(r['ingredients']) > 0]

    if not recipes_with_ingredients:
        print("No recipes with ingredients found after cleaning for clustering.")
        return pd.DataFrame(), []

    # Sử dụng ID của món ăn làm index nếu có, nếu không thì dùng index tạo
    recipe_indices = [r.get('id', f"recipe_{i}") for i, r in enumerate(recipes_with_ingredients)]

    valid_unique_ingredients = [ing for ing in unique_ingredients_vi if isinstance(ing, str) and ing]
    print(f"Using {len(valid_unique_ingredients)} valid unique ingredients for vectorization.")
    print(f"Vectorizing {len(recipes_with_ingredients)} recipes for clustering.")

    # Tạo DataFrame với cột là các nguyên liệu duy nhất và hàng là các món ăn
    ingredient_df = pd.DataFrame(False, index=recipe_indices, columns=valid_unique_ingredients)

    # Đánh dấu True nếu món ăn chứa nguyên liệu tương ứng
    for i, recipe in enumerate(recipes_with_ingredients):
        recipe_id = recipe.get('id', f"recipe_{i}")
        if recipe_id in ingredient_df.index: # Đảm bảo ID/index tồn tại trong DataFrame
             if "ingredients" in recipe and isinstance(recipe["ingredients"], list):
                 for ingredient in recipe['ingredients']:
                     # Chỉ đánh dấu nếu nguyên liệu đã được chuẩn hóa và nằm trong danh sách cột
                     if ingredient in valid_unique_ingredients:
                         ingredient_df.loc[recipe_id, ingredient] = True

    ingredient_vectors = ingredient_df.astype(int)

    print(f"Created ingredient vectors with shape: {ingredient_vectors.shape}")
    return ingredient_vectors, list(ingredient_df.index) # Trả về DataFrame vector và list index (có thể là id gốc)


# --- 4. Perform K-means Clustering (Lưu kết quả với ID và cluster) ---
def perform_kmeans_clustering(ingredient_vectors, recipe_indices, n_clusters=20, output_filepath=None):
    """
    Thực hiện thuật toán K-means, trả về model và DataFrame kết quả nhãn cluster,
    và tùy chọn lưu nhãn cluster vào file JSON.
    recipe_indices là list id hoặc index của các món ăn tương ứng với các hàng trong ingredient_vectors.
    """
    if ingredient_vectors.empty:
        print("Ingredient vectors are empty. Cannot perform K-means.")
        return None, pd.DataFrame(columns=['id', 'cluster'])

    # Điều chỉnh số cluster nếu số mẫu ít hơn số cluster
    if ingredient_vectors.shape[0] < n_clusters:
        print(f"Warning: Number of samples ({ingredient_vectors.shape[0]}) is less than n_clusters ({n_clusters}). Setting n_clusters to number of samples.")
        n_clusters = ingredient_vectors.shape[0]
        if n_clusters == 0:
             print("No samples to cluster.")
             return None, pd.DataFrame(columns=['id', 'cluster'])


    print(f"\n--- Performing K-means Clustering ---")
    print(f"Running K-means with n_clusters={n_clusters} on {ingredient_vectors.shape[0]} recipes...")
    try:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_assignments = kmeans.fit_predict(ingredient_vectors)

        print("K-means clustering finished.")

        # Tạo DataFrame kết quả với ID/index của món ăn và nhãn cluster
        cluster_results = pd.DataFrame({'id': recipe_indices, 'cluster': cluster_assignments})

        if output_filepath:
            print(f"Saving cluster assignments to: {output_filepath}")
            try:
                cluster_results.to_json(output_filepath, orient='records', indent=4)
                print("Saving cluster assignments complete.")
            except IOError as e:
                print(f"Error: Could not write cluster assignments to file {output_filepath}. {e}")

        return kmeans, cluster_results
    except Exception as e:
        print(f"An error occurred during K-means clustering: {e}")
        return None, pd.DataFrame(columns=['id', 'cluster'])


# --- 5. Prepare Data for Association Rules ---
def prepare_data_for_association_rules(cleaned_recipes):
    """Chuẩn bị dữ liệu cho luật kết hợp: danh sách các transaction (món ăn).
    Chỉ sử dụng các món có ít nhất một nguyên liệu."""
    print(f"\n--- Preparing Data for Association Rules ---")
    # Lọc chỉ lấy những món có danh sách nguyên liệu không rỗng
    transactions = [recipe['ingredients'] for recipe in cleaned_recipes if recipe.get('ingredients') and len(recipe['ingredients']) > 0]

    print(f"Prepared {len(transactions)} transactions (recipes with ingredients).")
    return transactions

# --- 6. Perform Association Rule Mining (Lưu kết quả bằng tiếng Việt) ---
def perform_association_rule_mining(transactions, min_support=0.01, min_confidence=0.4, output_filepath=None):
    """
    Thực hiện thuật toán Apriori, sinh luật kết hợp, và tùy chọn lưu luật vào file JSON.
    Làm việc với tên nguyên liệu tiếng Việt.
    """
    if not transactions:
        print("No transactions available for association rule mining.")
        return pd.DataFrame()

    print(f"\n--- Performing Association Rule Mining ---")

    try:
        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df_onehot = pd.DataFrame(te_ary, columns=te.columns_)

        print(f"One-hot encoded data shape: {df_onehot.shape}")

        if df_onehot.empty:
             print("One-hot encoded data is empty. No rules can be generated.")
             return pd.DataFrame()

        print(f"Finding frequent itemsets with Apriori, min_support={min_support}...")
        frequent_itemsets = apriori(df_onehot, min_support=min_support, use_colnames=True)
        print(f"Found {len(frequent_itemsets)} frequent itemsets.")

        if frequent_itemsets.empty:
             print("No frequent itemsets found with the given min_support.")
             return pd.DataFrame()


        print(f"Generating association rules with min_confidence={min_confidence}...")
        rules_df = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)

        rules_df = rules_df.sort_values(by='confidence', ascending=False)
        # Chuyển frozensets sang list/string cho tương thích JSON
        rules_df['antecedents'] = rules_df['antecedents'].apply(lambda x: list(x))
        rules_df['consequents'] = rules_df['consequents'].apply(lambda x: list(x))

        print(f"Found {len(rules_df)} association rules.")

        if output_filepath:
            print(f"Saving association rules to: {output_filepath}")
            try:
                # --- Sửa lỗi tiếng Việt lần cuối: Chuyển DataFrame sang list of dict và dùng json.dump ---
                rules_list = rules_df[['antecedents', 'consequents', 'support', 'confidence', 'lift']].to_dict(orient='records')

                # Mở file rõ ràng với encoding='utf-8'
                with open(output_filepath, 'w', encoding='utf-8') as f:
                    # Dùng json.dump để ghi, kèm ensure_ascii=False
                    json.dump(rules_list, f, indent=4, ensure_ascii=False)

                print("Saving association rules complete.")
            except IOError as e:
                print(f"Error: Could not write association rules to file {output_filepath}. {e}")
            except Exception as e: # Bắt thêm lỗi khác có thể xảy ra khi ghi file
                 print(f"An unexpected error occurred while saving association rules: {e}")


        return rules_df
    except Exception as e:
         print(f"An error occurred during association rule mining: {e}")
         return pd.DataFrame()


# --- Main Execution Block ---
if __name__ == "__main__":

    # --- Tải hoặc Tạo Map từ File JSON ---
    print("\n--- Loading or Creating Map Files ---")
    # Tải map chuẩn hóa tiếng Anh, nếu file không tồn tại sẽ tạo mới với default
    en_standardization_map = load_map_from_json(EN_STANDARDIZATION_MAP_PATH, DEFAULT_EN_STANDARDIZATION_MAP)
    # Tải map dịch tiếng Việt, nếu file không tồn tại sẽ tạo mới với default
    en_to_vi_map = load_map_from_json(EN_TO_VI_MAP_PATH, DEFAULT_EN_TO_VI_MAP)

    print(f"Loaded {len(en_standardization_map)} entries from {os.path.basename(EN_STANDARDIZATION_MAP_PATH)}")
    print(f"Loaded {len(en_to_vi_map)} entries from {os.path.basename(EN_TO_VI_MAP_PATH)}")


    # --- Step 1 & 2: Load, Clean (to Vietnamese), and Save Data ---
    # Truyền các bản đồ đã tải vào hàm làm sạch
    cleaned_recipes_vi, unique_ingredients_list_vi = load_clean_and_save_data(
        INPUT_FILE_PATH,
        CLEANED_FILE_PATH,
        UNIQUE_INGREDIENTS_LIST_FILE_PATH,
        UNIQUE_INGREDIENTS_FILE_PATH_FOR_MAPPING, # Truyền đường dẫn file txt để lưu
        en_standardization_map, # Truyền map chuẩn hóa tiếng Anh
        en_to_vi_map           # Truyền map dịch tiếng Việt
    )

    # Kiểm tra nếu quá trình làm sạch thành công và có dữ liệu
    if cleaned_recipes_vi is None or not cleaned_recipes_vi:
        print("\nData loading or cleaning failed or resulted in empty data. Exiting analysis steps.")
        exit()

    # Lọc ra các món có nguyên liệu để phân tích
    cleaned_recipes_for_analysis = [r for r in cleaned_recipes_vi if r.get('ingredients') and len(r['ingredients']) > 0]

    if not cleaned_recipes_for_analysis:
        print("\nNo recipes with ingredients left after cleaning. Cannot perform clustering or association rules mining.")
        print("Please check your cleaning maps or input data.")
        # Vẫn in ra hướng dẫn cập nhật map vì đây là lý do phổ biến khiến dữ liệu trống
        print(f"\n--- IMPORTANT: Manual Map Review and Update ---")
        print(f"Review the unique ingredients saved in '{UNIQUE_INGREDIENTS_FILE_PATH_FOR_MAPPING}'.")
        print(f"Edit the map files '{os.path.basename(EN_STANDARDIZATION_MAP_PATH)}' and '{os.path.basename(EN_TO_VI_MAP_PATH)}' in the '{DATA_DIR}' directory.")
        print(f"Add/update entries based on the unique ingredients list to ensure ingredients are not incorrectly filtered out.")
        print(f"RE-RUN THIS SCRIPT after updating the map files.")

        exit() # Dừng script nếu không có dữ liệu để phân tích


    print(f"\n--- IMPORTANT: Manual Map Review and Update ---")
    print(f"Review the unique ingredients saved in '{UNIQUE_INGREDIENTS_FILE_PATH_FOR_MAPPING}'.")
    print(f"Edit the map files '{os.path.basename(EN_STANDARDIZATION_MAP_PATH)}' and '{os.path.basename(EN_TO_VI_MAP_PATH)}' in the '{DATA_DIR}' directory.")
    print(f"Add/update entries based on the unique ingredients list.")
    print(f"RE-RUN THIS SCRIPT after updating the map files until the unique ingredient list looks satisfactory.")
    print(f"The K-means and Association Rules steps below use the results from the LAST successful cleaning run.")


    # --- Proceeding with Analysis steps using cleaned data ---
    print(f"\n--- Proceeding with Analysis steps using {len(cleaned_recipes_for_analysis)} recipes with ingredients (Vietnamese names) ---")


    # --- Step 3: Prepare Data for Clustering ---
    ingredient_vectors, recipe_indices = prepare_data_for_clustering(cleaned_recipes_for_analysis, unique_ingredients_list_vi)

    if ingredient_vectors.empty:
        print("Ingredient vectors are empty after preparation. Cannot perform K-means or Association Rules.")
    else:
        # --- Step 4: Perform K-means Clustering ---
        N_CLUSTERS = 20 # Số lượng cluster bạn muốn, cần cân nhắc dựa trên kích thước và đặc trưng dữ liệu
        kmeans_model, cluster_results_df = perform_kmeans_clustering(
            ingredient_vectors,
            recipe_indices,
            n_clusters=N_CLUSTERS,
            output_filepath=KMEANS_CLUSTERS_FILE_PATH
        )

        if cluster_results_df is not None and not cluster_results_df.empty:
            print("\n--- K-means Clustering Results (Sample) ---")
            print(cluster_results_df.head())

        # --- Step 5: Prepare Data for Association Rules ---
        transactions = prepare_data_for_association_rules(cleaned_recipes_for_analysis)

        # --- Step 6: Perform Association Rule Mining ---
        # Cần thử nghiệm để tìm ra ngưỡng support và confidence phù hợp với dữ liệu của bạn.
        # Ngưỡng quá cao sẽ không tìm thấy luật nào, quá thấp sẽ có quá nhiều luật không hữu ích.
        MIN_SUPPORT_RULE = 0.01 # Ví dụ: xuất hiện trong ít nhất 0.3% số món ăn
        MIN_CONFIDENCE_RULE = 0.4 # Ví dụ: khi có A, có 40% khả năng có B

        association_rules_df = perform_association_rule_mining(
            transactions,
            min_support=MIN_SUPPORT_RULE,
            min_confidence=MIN_CONFIDENCE_RULE,
            output_filepath=ASSOCIATION_RULES_FILE_PATH
        )

        print("\n--- Association Rules Results (Sample) ---")
        if association_rules_df is not None and not association_rules_df.empty:
            print(association_rules_df[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(15).round(3))
        else:
            print("No association rules found with the given min_support and min_confidence.")

    print("\n--- Final Data Processing and Analysis Complete ---")

    # Các file output JSON đã được tạo trong thư mục 'data/':
    # - clean_DuLieu_vi.json: Dữ liệu món ăn đã làm sạch (tên nguyên liệu tiếng Việt).
    # - unique_ingredients_list_vi.json: Danh sách tất cả nguyên liệu duy nhất (tiếng Việt).
    # - recipe_clusters_vi.json: Món ăn nào thuộc cluster K-means nào.
    # - association_rules_vi.json: Các luật kết hợp đã tìm được (tên nguyên liệu tiếng Việt).
    # - unique_ingredients_for_mapping.txt: Danh sách nguyên liệu sau làm sạch để tiện review.
    # - en_standardization_map.json: File map chuẩn hóa tiếng Anh (để bạn chỉnh sửa).
    # - en_to_vi_map.json: File map dịch tiếng Việt (để bạn chỉnh sửa).