package validator

import (
	"github.com/go-playground/validator/v10"
)

// Instancia única del validador para ahorrar memoria
var validate = validator.New()

// ValidateStruct valida cualquier estructura basada en sus tags `validate:""`
func ValidateStruct(s interface{}) error {
	return validate.Struct(s)
}

// IsValidationError permite al handler saber si el error es de validación de datos
func IsValidationError(err error) bool {
	_, ok := err.(validator.ValidationErrors)
	return ok
}