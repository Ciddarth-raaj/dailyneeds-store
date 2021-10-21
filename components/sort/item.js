import React from "react";
import styles from "../../styles/productpage.module.css";
import { sortable } from 'react-sortable';

class Item extends React.Component {
    render() {
        return (
        <div {...this.props}>
        <img
            src={this.props.children}
            className={styles.image}
        />
        </div>
      )
    }
  }
   
export default sortable(Item);