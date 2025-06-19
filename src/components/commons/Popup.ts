// Popup.ts - Enhanced reusable popup with sidebar buttons and dynamic content
import { Container, Sprite, Graphics, Text, Assets } from 'pixi.js';
import { createButton } from '../commons/Button';

// Interface for sidebar button configuration
interface SidebarButton {
  id: string;
  label: string;
  texture?: string;
  onClick?: (buttonId: string) => void;
}

// Interface for popup content sections
interface ContentSection {
  id: string;
  title?: string;
  render: (container: Container, dimensions: PopupDimensions) => void;
  resize?: (container: Container, dimensions: PopupDimensions) => void;
}

interface PopupOptions {
  width: number;
  height: number;
  onClose: () => void;
  panelWidthScale?: number;
  panelHeightScale?: number;
  closeButtonTexture?: string;
  
  // NEW: Sidebar and content options
  sidebarButtons?: SidebarButton[];
  contentSections?: ContentSection[];
  defaultActiveSection?: string;
  
  // Legacy support for simple content
  renderContent?: (container: Container, dimensions: PopupDimensions) => void;
}

export interface PopupDimensions {
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  containerWidth: number;
  containerHeight: number;
  
  // NEW: Sidebar and content area dimensions
  sidebarX: number;
  sidebarY: number;
  sidebarWidth: number;
  sidebarHeight: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
}

const createPopup = ({ 
  width, 
  height, 
  onClose,
  panelWidthScale = 0.9,
  panelHeightScale = 0.9,
  closeButtonTexture = 'backButton',
  sidebarButtons = [],
  contentSections = [],
  defaultActiveSection,
  renderContent
}: PopupOptions) => {
  const container = new Container();
  container.zIndex = 200;
  
  // State management
  let activeSection = defaultActiveSection || (contentSections.length > 0 ? contentSections[0].id : '');
  let activeSectionContainer: Container | null = null;
  let sidebarButtonContainers: Map<string, Container> = new Map();
  
  // Calculate dimensions
  const calculateDimensions = (w: number, h: number): PopupDimensions => {
    const panelWidth = w * panelWidthScale;
    const panelHeight = h * panelHeightScale;
    const panelX = (w - panelWidth) / 2;
    const panelY = (h - panelHeight) / 2;
    
    // Sidebar takes 15% of panel width (reduced from 30%)
    const sidebarWidth = panelWidth * 0.25;
    const sidebarHeight = panelHeight * 0.70; // Leave space for title
    const sidebarX = panelX + panelWidth * 0.06; // Small margin from left
    const sidebarY = panelY + panelHeight * 0.20; // Below title area
    
    // Content area takes remaining 80% (5% margin between sidebar and content)
    const contentWidth = panelWidth * 0.62;
    const contentHeight = sidebarHeight * 0.89;
    const contentX = sidebarX + sidebarWidth - panelWidth * 0.004; // Margin between sidebar and content
    const contentY = sidebarY;
    
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      containerWidth: w,
      containerHeight: h,
      sidebarX,
      sidebarY,
      sidebarWidth,
      sidebarHeight,
      contentX,
      contentY,
      contentWidth,
      contentHeight
    };
  };

  let dimensions = calculateDimensions(width, height);
  
  // Background with semi-transparent dark overlay
  const background = new Graphics();
  background.rect(0, 0, width, height);
  background.fill({ color: 0x000000, alpha: 0.7 });
  background.eventMode = 'static'; 
  background.on('pointerdown', onClose); // Close when clicking outside
  container.addChild(background);
  
  // Popup panel using the provided texture
  const panel = new Sprite(Assets.get('popup'));
  panel.width = dimensions.panelWidth;
  panel.height = dimensions.panelHeight;
  panel.x = dimensions.panelX;
  panel.y = dimensions.panelY;
  panel.eventMode = 'static';
  panel.on('pointerdown', (e) => { e.stopPropagation(); });
  container.addChild(panel);
  
  // Close button
  const closeButton = createButton({
    texture: Assets.get(closeButtonTexture),
    width: height * 0.08,
    height: height * 0.08,
    x: dimensions.panelWidth - dimensions.panelWidth * 0.08,
    y: dimensions.panelY + (height * 0.17),
    anchorX: 0.5,
    anchorY: 0.5,
    onClick: onClose,
  });
  container.addChild(closeButton);
  
  // Create sidebar container
  const sidebarContainer = new Container();
  sidebarContainer.x = dimensions.sidebarX;
  sidebarContainer.y = dimensions.sidebarY;
  container.addChild(sidebarContainer);
  
  // Create content area container
  const contentAreaContainer = new Container();
  contentAreaContainer.x = dimensions.contentX;
  contentAreaContainer.y = dimensions.contentY;
  container.addChild(contentAreaContainer);
  
  // Function to render sidebar buttons
  const renderSidebarButtons = () => {
    sidebarContainer.removeChildren();
    sidebarButtonContainers.clear();
    
    if (sidebarButtons.length === 0) return;
    
    // Button sizing with reduced spacing
    const buttonSpacing = -60; // Reduced spacing between buttons (was 15)
    const totalSpacing = (sidebarButtons.length - 1) * buttonSpacing;
    const availableHeight = dimensions.sidebarHeight - totalSpacing;
    const buttonHeight = availableHeight / sidebarButtons.length;
    
    // Calculate total content height for centering
    const totalContentHeight = (buttonHeight * sidebarButtons.length) + totalSpacing;
    const startY = (dimensions.sidebarHeight - totalContentHeight) / 2;
    
    console.log(`🔧 Rendering ${sidebarButtons.length} sidebar buttons`);
    console.log(`🔧 Button height: ${buttonHeight}, spacing: ${buttonSpacing}, start Y: ${startY}`);
    
    sidebarButtons.forEach((buttonConfig, index) => {
      const buttonY = startY + (index * (buttonHeight + buttonSpacing));
      
      console.log(`🔧 Rendering button ${index}: ${buttonConfig.label} at Y: ${buttonY}`);
      
      // Create button container for each button
      const buttonContainer = new Container();
      buttonContainer.y = buttonY;
      
      // Create button background - extremely small background with rounded corners
      const buttonBg = new Graphics();
      
      // Button background dimensions with much more padding (extremely small background)
      const bgPadding = 57; // Much larger padding for extremely small background
      const bgWidth = dimensions.sidebarWidth - (bgPadding * 4);
      const bgHeight = buttonHeight - (bgPadding * 2);
      
      // buttonBg.roundRect(bgPadding, bgPadding, bgWidth, bgHeight, 40);
      
      // // Highlight active button
      const isActive = buttonConfig.id === activeSection;
      // buttonBg.fill({ 
      //   color: isActive ? 0x4A90E2 : 0x2C3E50, 
      //   alpha: isActive ? 0.8 : 0.4
      // });
      // buttonBg.eventMode = 'static';
      // buttonBg.cursor = 'pointer';
      
      // Button texture (if available)
      let buttonIcon: Sprite | null = null;
      if (buttonConfig.texture) {
        try {
          buttonIcon = new Sprite(Assets.get(buttonConfig.texture));
          
          // Scale icon to fit button with minimal padding (bigger icon)
          const iconPadding = 4; // Even less padding for bigger icon
          const availableWidth = dimensions.sidebarWidth - (iconPadding * 2.5);
          const availableHeight = buttonHeight - (iconPadding * 2.5);
          
          // Scale to fit while maintaining aspect ratio
          const scaleX = availableWidth / buttonIcon.width;
          const scaleY = availableHeight / buttonIcon.height;
          const scale = Math.min(scaleX, scaleY);
          
          buttonIcon.scale.set(scale);
          buttonIcon.anchor.set(0.5);
          buttonIcon.x = dimensions.sidebarWidth / 2;
          buttonIcon.y = buttonHeight / 2;
          
          console.log(`🔧 Icon for ${buttonConfig.label}: scale=${scale}, size=${buttonIcon.width}x${buttonIcon.height}`);
          
        } catch (error) {
          console.warn(`Button texture '${buttonConfig.texture}' not found`);
          buttonIcon = null;
        }
      }
      
      // Only add label if no texture is available
      let buttonLabel: Text | null = null;
      if (!buttonIcon) {
        buttonLabel = new Text(buttonConfig.label, {
          fontFamily: 'GameFont',
          fontSize: Math.min(16, buttonHeight * 0.3),
          fill: isActive ? 0xFFFFFF : 0xBDC3C7,
          align: 'center',
          fontWeight: isActive ? 'bold' : 'normal'
        });
        buttonLabel.anchor.set(0.5);
        buttonLabel.x = dimensions.sidebarWidth / 2;
        buttonLabel.y = buttonHeight / 2;
      }
      
      // Handle button click
      const handleButtonClick = () => {
        console.log(`🔧 Button clicked: ${buttonConfig.label} (${buttonConfig.id})`);
        if (activeSection !== buttonConfig.id) {
          activeSection = buttonConfig.id;
          renderSidebarButtons(); // Re-render to update active state
          renderActiveContent(); // Update content area
          
          // Call custom onClick if provided
          if (buttonConfig.onClick) {
            buttonConfig.onClick(buttonConfig.id);
          }
        }
      };
      
      buttonBg.on('pointerdown', handleButtonClick);
      
      if (buttonIcon) {
        buttonIcon.eventMode = 'static';
        buttonIcon.on('pointerdown', handleButtonClick);
      }
      
      if (buttonLabel) {
        buttonLabel.eventMode = 'static';
        buttonLabel.on('pointerdown', handleButtonClick);
      }
      
      // Add elements to button container
      buttonContainer.addChild(buttonBg);
      if (buttonIcon) {
        buttonContainer.addChild(buttonIcon);
      }
      if (buttonLabel) {
        buttonContainer.addChild(buttonLabel);
      }
      
      // Add button container to sidebar
      sidebarContainer.addChild(buttonContainer);
      
      // Store reference for later updates
      sidebarButtonContainers.set(buttonConfig.id, buttonContainer);
      
      console.log(`🔧 Button ${index} added to sidebar at position (${buttonContainer.x}, ${buttonContainer.y})`);
    });
    
    console.log(`🔧 Sidebar container children count: ${sidebarContainer.children.length}`);
    console.log(`🔧 Sidebar container position: (${sidebarContainer.x}, ${sidebarContainer.y})`);
    console.log(`🔧 Sidebar dimensions: ${dimensions.sidebarWidth} x ${dimensions.sidebarHeight}`);
  };
  
  // Function to render active content section
  const renderActiveContent = () => {
    // Clear current content
    contentAreaContainer.removeChildren();
    activeSectionContainer = null;
    
    // Find and render active section
    const activeContentSection = contentSections.find(section => section.id === activeSection);
    if (activeContentSection) {
      activeSectionContainer = new Container();
      
      // Add title if provided
      if (activeContentSection.title) {
        const title = new Text(activeContentSection.title, {
          fontFamily: 'GameFont',
          fontSize: Math.min(28, dimensions.contentHeight * 0.08),
          fill: 0xFFFFFF,
          align: 'left',
          fontWeight: 'bold'
        });
        title.x = 0;
        title.y = 0;
        activeSectionContainer.addChild(title);
      }
      
      // Render custom content
      const contentContainer = new Container();
      contentContainer.y = activeContentSection.title ? dimensions.contentHeight * 0.15 : 0;
      
      // Adjust dimensions for content rendering
      const contentDimensions: PopupDimensions = {
        ...dimensions,
        contentY: contentContainer.y,
        contentHeight: dimensions.contentHeight - contentContainer.y
      };
      
      activeContentSection.render(contentContainer, contentDimensions);
      activeSectionContainer.addChild(contentContainer);
      
      // Store resize function for this section
      (activeSectionContainer as any).customResize = () => {
        if (activeContentSection.resize) {
          activeContentSection.resize(contentContainer, dimensions);
        }
      };
      
      contentAreaContainer.addChild(activeSectionContainer);
    }
  };
  
  // Initialize sidebar and content (if using new system)
  if (sidebarButtons.length > 0 || contentSections.length > 0) {
    renderSidebarButtons();
    renderActiveContent();
  }
  
  // Legacy support: render simple content if provided
  if (renderContent && sidebarButtons.length === 0) {
    renderContent(container, dimensions);
  }
  
  // Resize function
  const resize = (newWidth: number, newHeight: number) => {
    dimensions = calculateDimensions(newWidth, newHeight);
    
    // Update background
    background.clear();
    background.rect(0, 0, newWidth, newHeight);
    background.fill({ color: 0x000000, alpha: 0.7 });
    
    // Update panel
    panel.width = dimensions.panelWidth;
    panel.height = dimensions.panelHeight;
    panel.x = dimensions.panelX;
    panel.y = dimensions.panelY;
    
    // Update close button
    closeButton.x = dimensions.panelX + newWidth * 0.08;
    closeButton.y = dimensions.panelY + (newHeight * 0.13);
    closeButton.width = newHeight * 0.08;
    closeButton.height = newHeight * 0.08;
    
    // Update sidebar position
    sidebarContainer.x = dimensions.sidebarX;
    sidebarContainer.y = dimensions.sidebarY;
    
    // Update content area position
    contentAreaContainer.x = dimensions.contentX;
    contentAreaContainer.y = dimensions.contentY;
    
    // Re-render sidebar and content with new dimensions
    if (sidebarButtons.length > 0 || contentSections.length > 0) {
      renderSidebarButtons();
      renderActiveContent();
    }
    
    // Legacy resize support
    if (renderContent && sidebarButtons.length === 0) {
      // Update custom content for legacy mode
      for (let i = 3; i < container.children.length; i++) {
        const child = container.children[i];
        if ((child as any).resize && typeof (child as any).resize === 'function') {
          (child as any).resize(dimensions);
        }
      }
    }
  };
  
  // Public API
  const popupAPI = {
    resize,
    setActiveSection: (sectionId: string) => {
      if (contentSections.find(s => s.id === sectionId)) {
        activeSection = sectionId;
        renderSidebarButtons();
        renderActiveContent();
      }
    },
    getActiveSection: () => activeSection,
    // ADD THIS LINE:
    renderActiveContent: () => renderActiveContent(),
    addSection: (section: ContentSection) => {
      contentSections.push(section);
      if (!activeSection) {
        activeSection = section.id;
      }
      renderSidebarButtons();
      renderActiveContent();
    },
    removeSection: (sectionId: string) => {
      const index = contentSections.findIndex(s => s.id === sectionId);
      if (index > -1) {
        contentSections.splice(index, 1);
        if (activeSection === sectionId && contentSections.length > 0) {
          activeSection = contentSections[0].id;
        }
        renderSidebarButtons();
        renderActiveContent();
      }
    }
  };
  
  (container as any).resize = resize;
  (container as any).api = popupAPI;
  
  return container;
};

// Export types for external use
export type { SidebarButton, ContentSection };
export default createPopup;