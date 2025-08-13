import React from 'react';

export default function RecipeModal() {
  return (
    <div id="addRecipeModal" className="modal custom-modal d-none">
      <div className="modal-content bg-white text-dark">
        <h3>Item Recipe</h3>
        <div className="recipe-container mb-3">
          <label className="form-label">Recipe Steps</label>
          <div className="recipe-rows"></div>
          <div className="d-flex gap-2 mb-2">
            <input type="text" className="form-control recipe-input" placeholder="Instruction" />
            <button type="button" className="btn btn-sm btn-secondary add-recipe-row">Add Step</button>
          </div>
        </div>
        <div className="ingredient-container mb-3">
          <label className="form-label">Ingredients</label>
          <div className="ingredient-rows"></div>
          <button type="button" className="btn btn-sm btn-secondary add-ingredient-row">Add Ingredient</button>
        </div>
        <div className="text-end">
          <button type="button" id="recipeSave" className="btn btn-primary">Save</button>
          <button type="button" id="recipeCancel" className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
