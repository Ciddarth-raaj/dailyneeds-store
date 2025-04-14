import React, { useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import GeneratorModal from "../../components/QRGenerator/GeneratorModal";

function Index() {
  const [generatorVisiblity, setGeneratorVisiblity] = useState(false);
  return (
    <GlobalWrapper>
      <GeneratorModal
        isOpen={generatorVisiblity}
        onClose={() => setGeneratorVisiblity(false)}
      />

      <CustomContainer
        title="QR Generator"
        filledHeader
        rightSection={
          <Button
            colorScheme="whiteAlpha"
            onClick={() => setGeneratorVisiblity(true)}
          >
            Import
          </Button>
        }
      ></CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
