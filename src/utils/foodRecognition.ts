import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { GOOGLE_API_KEY, USDA_API_KEY } from '@env';

// Google Cloud Vision API configuration
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// USDA FoodData Central API configuration
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

interface VisionResponse {
  name: string;
  description: string;
}

interface VisionApiResponse {
  responses: {
    labelAnnotations?: { description: string; score: number }[];
    localizedObjectAnnotations?: { name: string; score: number }[];
  }[];
}

interface Nutrient {
  nutrientName: string;
  value: number;
  unitName: string;
}

interface FoodData {
  fdcId: number;
  description: string;
  foodCategory?: string;
  foodNutrients: Nutrient[];
}

interface UsdaSearchResponse {
  foods: FoodData[];
}

interface UsdaFoodResponse {
  fdcId: number;
  description: string;
  foodCategory?: string;
  foodNutrients: Nutrient[];
}

interface NutritionalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface FoodAnalysisResult {
  name: string;
  description: string;
  nutritionalData?: NutritionalData;
  isFoodItem: boolean;
}

/**
 * Sends an image to Google Cloud Vision API for food recognition
 * @param imageUri - The URI of the image to analyze
 * @returns Promise with the analysis result
 */
export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysisResult> => {
  try {
    // Debug log for API key
    console.log('Using GOOGLE_API_KEY:', GOOGLE_API_KEY);
    // Check if API key is set
    if (!GOOGLE_API_KEY) {
      throw new Error('Google Cloud Vision API key is not set. Please configure it in your .env and app.json.');
    }

    // Read the image file as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Make API request to Google Cloud Vision
    const response = await axios.post<VisionApiResponse>(
      `${GOOGLE_VISION_API_URL}?key=${GOOGLE_API_KEY}`,
      {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults: 10,
              },
              {
                type: 'OBJECT_LOCALIZATION',
                maxResults: 10,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Log the full response for debugging
    console.log('Google Vision API Response:', JSON.stringify(response.data, null, 2));

    // Parse the response
    const data = response.data.responses[0];
    let name = 'Unknown Food';
    let description = 'No detailed description available.';

    // Function to check if a description is food-related (basic keyword check)
    const isFoodRelated = (desc: string) => {
      const foodKeywords = [
        'sushi', 'croissant', 'fish', 'tuna', 'salmon', 'cod', 'shrimp', 'lobster', 'crab', 'oyster', 'clam', 
        'orange', 'pineapple', 'apple', 'banana', 'grape', 'watermelon', 'kiwi', 'mango', 'papaya', 'peach', 
        'pear', 'plum', 'cherry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'coconut', 'avocado', 
        'broccoli', 'carrot', 'spinach', 'kale', 'lettuce', 'cucumber', 'zucchini', 'eggplant', 'pepper', 
        'tomato', 'potato', 'onion', 'garlic', 'ginger', 'mushroom', 'pumpkin', 'squash', 'corn', 'peas', 
        'chicken', 'beef', 'pork', 'lamb', 'duck', 'turkey', 'bacon', 'sausage', 'hotdog', 'steak', 'ham', 
        'pizza', 'burger', 'sandwich', 'taco', 'burrito', 'quesadilla', 'pasta', 'spaghetti', 'lasagna', 
        'ravioli', 'noodles', 'soup', 'stew', 'chowder', 'salad', 'cake', 'pie', 'cookie', 'brownie', 
        'donut', 'muffin', 'pancake', 'waffle', 'croissant', 'bagel', 'toast', 'cheese', 'yogurt', 'milk', 
        'ice cream', 'chocolate', 'candy', 'honey', 'jam', 'jelly', 'syrup', 'tea', 'coffee', 'juice', 
        'smoothie', 'soda', 'beer', 'wine', 'whiskey', 'cocktail',
        'hotdog', 'sushi', 'fish', 'tuna', 'orange', 'pineapple',
        'paneer', 'dal', 'samosa', 'pakora', 'biryani', 'naan', 'roti', 'paratha', 'chapati', 'idli', 
        'dosa', 'uttapam', 'poha', 'upma', 'chole', 'rajma', 'kadhi', 'sabzi', 'aloo', 'gobi', 'bhindi', 
        'baingan', 'kheer', 'gulab jamun', 'jalebi', 'laddu', 'halwa', 'pulao', 'khichdi', 'rasgulla', 
        'malai kofta', 'palak paneer', 'matar paneer', 'veg curry', 'veg biryani', 'veg pulao', 'tikka', 
        'chaat', 'pani puri', 'bhel puri', 'sev puri', 'dahi puri', 'vada pav', 'misal pav', 'pav bhaji'
      ];
      return foodKeywords.some(keyword => desc.toLowerCase().includes(keyword));
    };

    // Function to check if a description is a generic category
    const isGenericCategory = (desc: string) => {
      const genericCategories = ['food','staple food', 'dish', 'meal', 'fruit', 'vegetable', 'meat', 'bread', 'drink', 'beverage', 'produce', 'plant', 'cuisine'];
      return genericCategories.includes(desc.toLowerCase());
    };

    // Combine both label and object annotations, prioritize by score and food relevance
    const allAnnotations = [
      ...(data.labelAnnotations || []).map(a => ({ type: 'label', description: a.description, score: a.score })),
      ...(data.localizedObjectAnnotations || []).map(a => ({ type: 'object', description: a.name, score: a.score }))
    ].sort((a, b) => b.score - a.score); // Sort by score descending

    // Select the first food-related annotation with highest score for display name
    const bestAnnotationForDisplay = allAnnotations.find(a => isFoodRelated(a.description));

    // For USDA API, prioritize specific food name over generic category
    let usdaQueryName = name;
    const specificAnnotation = allAnnotations.find(a => isFoodRelated(a.description) && !isGenericCategory(a.description));
    if (specificAnnotation) {
      usdaQueryName = specificAnnotation.description;
      console.log(`Selected specific food name for USDA API: ${usdaQueryName}`);
      // Use the specific food name as the display name
      name = specificAnnotation.description || 'Unknown Food';
    } else if (bestAnnotationForDisplay) {
      usdaQueryName = bestAnnotationForDisplay.description;
      name = bestAnnotationForDisplay.description || 'Unknown Food';
      console.log(`No specific food name found, using display name for USDA API: ${usdaQueryName}`);
    } else if (allAnnotations.length > 0) {
      usdaQueryName = allAnnotations[0].description;
      name = allAnnotations[0].description || 'Unknown Food';
      console.log(`No food-related name found, using top annotation for USDA API: ${usdaQueryName}`);
    }

    if (bestAnnotationForDisplay || allAnnotations.length > 0) {
      description = allAnnotations.map(a => `${a.description} (${(a.score * 100).toFixed(2)}%) [${a.type}]`).join(', ');
    }

    // Fetch nutritional data from USDA API if a food item is identified
    let nutritionalData: NutritionalData | undefined;
    let isFoodItem = false;
    if (usdaQueryName !== 'Unknown Food') {
      isFoodItem = true;
      try {
        nutritionalData = await fetchNutritionalData(usdaQueryName);
      } catch (error) {
        console.error('Error fetching nutritional data from USDA API:', error);
      }
    }

    return {
      name,
      description,
      nutritionalData,
      isFoodItem
    };
  } catch (error: any) {
    console.error('Error analyzing food image with Google Cloud Vision API:', error);
    if (error.response) {
      console.error('Google Vision API Error Response:', error.response.data);
    }
    if (error.response && error.response.status === 403) {
      throw new Error('Google Cloud Vision API access denied (403). Please check if your API key is valid and the API is enabled for your project.');
    }
    throw new Error('Failed to analyze food image. Please try again. Error: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Fetches nutritional data from USDA FoodData Central API based on food name
 * @param foodName - The name of the food to search for
 * @returns Promise with nutritional data
 */
const fetchNutritionalData = async (foodName: string): Promise<NutritionalData> => {
  try {
    // Debug log for API key
    console.log('Using USDA_API_KEY:', USDA_API_KEY);
    // Check if API key is set
    if (!USDA_API_KEY) {
      throw new Error('USDA API key is not set. Please configure it in your .env and app.json.');
    }

    // Search for the food item
    const searchResponse = await axios.get<UsdaSearchResponse>(
      `${USDA_API_URL}/foods/search?query=${encodeURIComponent(foodName)}&dataType=Survey%20(FNDDS)&pageSize=5&api_key=${USDA_API_KEY}`
    );

    console.log(`USDA API Search Results for ${foodName}:`, JSON.stringify(searchResponse.data.foods, null, 2));

    if (searchResponse.data.foods.length === 0) {
      throw new Error(`No matching food found for ${foodName}`);
    }

    const foodData = searchResponse.data.foods[0];
    console.log(`Selected Food Data for ${foodName}:`, JSON.stringify(foodData, null, 2));

    // Extract nutritional data
    const nutritionalData: NutritionalData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    foodData.foodNutrients.forEach((nutrient) => {
      const name = nutrient.nutrientName.toLowerCase();
      if (name.includes('energy')) {
        nutritionalData.calories = nutrient.value;
      } else if (name.includes('protein')) {
        nutritionalData.protein = nutrient.value;
      } else if (name.includes('carbohydrate')) {
        nutritionalData.carbs = nutrient.value;
      } else if (name.includes('total lipid') || name.includes('fat')) {
        nutritionalData.fat = nutrient.value;
      } else if (name.includes('fiber')) {
        nutritionalData.fiber = nutrient.value;
      } else if (name.includes('sugar')) {
        nutritionalData.sugar = nutrient.value;
      } else if (name.includes('sodium')) {
        nutritionalData.sodium = nutrient.value;
      }
    });

    return nutritionalData;
  } catch (error: any) {
    console.error('USDA API Error:', error.message);
    throw new Error(`Failed to fetch nutritional data for ${foodName}`);
  }
};
