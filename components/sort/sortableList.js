import React from "react";
import SortableItem from "./item";
import styles from "../../styles/productpage.module.css";

class SortableList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            items: this.props.items
        };
    }
    onSortItems = (items) => {
      this.setState({
        items: items
      });
    }
   
    render() {
      const { items } = this.state;
      var listItems = items.map((item, i) => {
        return (
          <SortableItem
            key={i}
            onSortItems={this.onSortItems}
            items={items}
            sortId={i}>{item}</SortableItem>
        );
      });
   
      return (
        <div className={styles.imageContainer}>
          {listItems}
        </div>
      )
    }
  };

  export default SortableList;