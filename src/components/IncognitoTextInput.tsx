import { 
  requireNativeComponent, 
  TextInputProps, 
  UIManager, 
  findNodeHandle 
} from 'react-native';
import React from 'react';

// Custom type for the native component to include the events we manually bridge
type NativeIncognitoTextInputProps = TextInputProps & {
  onChangeContentSize?: (event: any) => void;
  onTextInput?: (event: any) => void;
};

const NativeIncognitoTextInput = requireNativeComponent<any>('IncognitoTextInput');

export const IncognitoTextInput = React.forwardRef<any, TextInputProps>((props, ref) => {
  const innerRef = React.useRef<any>(null);
  const [mostRecentEventCount, setMostRecentEventCount] = React.useState(0);

  // Expose both native and custom methods through the ref
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      innerRef.current?.focus();
    },
    blur: () => {
      innerRef.current?.blur();
    },
    clear: () => {
      // Explicitly dispatch the native COMMAND_CLEAR (1) to our View Manager
      const handle = findNodeHandle(innerRef.current);
      if (handle) {
        UIManager.dispatchViewManagerCommand(handle, 1, undefined);
      }
    },
    setNativeProps: (nativeProps: any) => {
      innerRef.current?.setNativeProps(nativeProps);
    },
    // Expose the underlying native component if needed
    getNativeElement: () => innerRef.current,
  }));

  const _onChange = (event: any) => {
    // 1. Sync the event count from native to React
    const { eventCount, text } = event.nativeEvent;
    if (eventCount !== undefined) {
      setMostRecentEventCount(eventCount);
    }

    // 2. Bridge the native 'onChange' event to the JS 'onChangeText' prop
    if (props.onChangeText) {
      props.onChangeText(text);
    }
    if (props.onChange) {
      props.onChange(event);
    }
  };

  const _onSelectionChange = (event: any) => {
    if (props.onSelectionChange) {
      props.onSelectionChange(event);
    }
  };

  return (
    <NativeIncognitoTextInput 
      {...props} 
      // Native ReactTextInputManager expects 'text' for the content and 'mostRecentEventCount' for sync
      text={props.value} 
      mostRecentEventCount={mostRecentEventCount}
      ref={innerRef} 
      onChange={_onChange}
      onSelectionChange={_onSelectionChange}
    />
  );
});

export default IncognitoTextInput;
