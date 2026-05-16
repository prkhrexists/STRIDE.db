import os
from tensorflow.keras.applications import MobileNet
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.optimizers import RMSprop

def create_mobilenet_crack_model(input_shape=(227, 227, 3)):
    """
    Creates the MobileNet architecture for crack detection
    based on the ZahraShahlaie/Crack-detection repo.
    """
    base_model = MobileNet(weights='imagenet', include_top=False, input_shape=input_shape)
    
    # Freeze the base model layers
    for layer in base_model.layers:
        layer.trainable = False

    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),
        Dense(256, activation='relu'),
        Dropout(0.5),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(1, activation='sigmoid') # Binary classification: 0 = No Crack, 1 = Crack
    ])

    model.compile(
        optimizer=RMSprop(learning_rate=0.0001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model

if __name__ == '__main__':
    # Save an initialized instance of the model for testing the pipeline
    model_path = os.path.join(os.path.dirname(__file__), 'crack_mobilenet.keras')
    print("Creating and saving base MobileNet crack model to", model_path)
    model = create_mobilenet_crack_model()
    model.save(model_path)
    print("Saved successfully. Note: This model is initialized with ImageNet weights and needs fine-tuning on a crack dataset.")
