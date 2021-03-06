
/*** The WebGUI Ticket
 * Requires: YAHOO, Dom, Event, DataSource, DataTable, Paginator
 *
 */

if ( typeof WebGUI == "undefined" ) {
    WebGUI  = {};
}

if ( typeof WebGUI.Ticket == "undefined" ) {
    WebGUI.Ticket  = {};
}

//***********************************************************************************
WebGUI.Ticket.editCommentsSetup = function() {
    var linkList = YAHOO.util.Dom.getElementsByClassName("editCommentButton",'a','comments');
    for(var i = 0; i < linkList.length; i++) {
        YAHOO.util.Event.addListener(linkList[i],'click',WebGUI.Ticket.loadField,{
            fieldId : linkList[i].id
        });
    }
}

//***********************************************************************************
WebGUI.Ticket.findFirstFormElement = function( node ) {
    var children    = YAHOO.util.Dom.getChildren(node);
    var hasChildren = children.length;
    if(hasChildren == 0) return null;
    //Check to see if the fields are the right types
    for( var i = 0; i < children.length; i++) {
        if(children[i].tagName == "INPUT" || children[i].tagName == "SELECT") return children[i];
        var inputNode = WebGUI.Ticket.findFirstFormElement(children[i]);
        if(inputNode != null) return inputNode;
    }
    //Nothing found
    return null;
};

//***********************************************************************************
WebGUI.Ticket.findUsers = function(o) {
    var oCallback = {
        success: function(o) {
            YAHOO.util.Dom.setStyle('userSearchIndicator','display','none');
            var userList = YAHOO.util.Dom.get('userList');
            // YAHOO.plugin.Dispatcher.process( "userList", o.responseText );
            userList.innerHTML = o.responseText;
            var linkList = YAHOO.util.Dom.getElementsByClassName("userListLink",'a','userList_div');
            for(var i = 0; i < linkList.length; i++) {
                YAHOO.util.Event.addListener(linkList[i],'click',WebGUI.Ticket.setAssignment,{ url:'/home/the-help-desk/1?func=setAssignment' });
            }
        },
        failure: function(o) {}
    };            
    YAHOO.util.Dom.setStyle('userSearchIndicator', 'display', '');
    YAHOO.util.Connect.setForm("userSearchForm");
    YAHOO.util.Connect.asyncRequest('POST', WebGUI.Ticket.userSearchUrl, oCallback);
};

//***********************************************************************************
WebGUI.Ticket.loadDataTable = function( oArgs ) {
    var oCallback = {
        success: function(o) {
            // YAHOO.plugin.Dispatcher.process( WebGUI.Ticket.dataTableId, o.responseText );
            YAHOO.util.Dom.get( WebGUI.Ticket.dataTableId ).innerHTML = o.responseText ;
        },
        failure: function(o) {}
    };
    var request = YAHOO.util.Connect.asyncRequest('GET',WebGUI.Ticket.viewTicketUrl, oCallback); 
};

//***********************************************************************************
WebGUI.Ticket.loadField = function(o, obj) {
    var button     = YAHOO.util.Event.getTarget(o);
    
    var fieldId    = obj.fieldId;    
    var url        = WebGUI.Ticket.getFormFieldUrl + ";fieldId=" + fieldId;    

    var oCallback = {
        success: function(o) {
            YAHOO.util.Dom.get( "field_id_"+fieldId ).innerHTML = o.responseText ;
            //Remove the current listener from the link
            var href             = YAHOO.util.Dom.getAncestorByTagName(button,"A");            
            YAHOO.util.Event.removeListener(href,'click',WebGUI.Ticket.loadField);
            WebGUI.Ticket.removeAllChildren(href);
            //Add the save button to the node
            var saveButton       = document.createElement("INPUT");
            saveButton.setAttribute("type","button");
            saveButton.setAttribute("value","save");
            href.appendChild(saveButton);
            //Add a new listener to the link
            YAHOO.util.Event.addListener(saveButton,'click',WebGUI.Ticket.saveFieldValue,{
                fieldId    : obj.fieldId
            });
            //Get the node
            var valueField = YAHOO.util.Dom.get("field_id_"+fieldId);
            //Get the form field added to the link node
            var formField = WebGUI.Ticket.findFirstFormElement(valueField);
            //Set focus on the form field
            var elem = new YAHOO.util.Element(formField);
            if(elem.get("onfocus") == null) {
                formField.focus();
            }
        },
        failure: function(o) {}
    };
    
    YAHOO.util.Connect.asyncRequest('GET', url, oCallback);
}

//***********************************************************************************
WebGUI.Ticket.postComment = function (evt, obj) {
    var commentsBtn = YAHOO.util.Dom.get("commentsBtn");
    var closeButton = YAHOO.util.Dom.get("closeBtn");
    var commentsBtnValue = YAHOO.util.Dom.get("commentsBtn").value
    commentsBtn.disabled = true;
    commentsBtn.value = "Submitting";
    if( closeButton ) {
        closeButton.disabled = true;
    }
    var url        = WebGUI.Ticket.postCommentUrl;
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
	        commentsBtn.disabled = false;
	        commentsBtn.value = commentsBtnValue;
		if( closeButton ) {
                    closeButton.disabled = false;
		}
            }
            else {
                YAHOO.util.Connect.asyncRequest('GET', WebGUI.Ticket.getCommentsUrl, {
                    success: function (o) {
                        YAHOO.util.Dom.get("comments").innerHTML = o.responseText;
                        //  re-set the linkage to the edit comment code...
			WebGUI.Ticket.editCommentsSetup();
                        YAHOO.util.Dom.get("commentsForm").reset();
                        //Set the average rating
                        var averageRatingImg   = YAHOO.util.Dom.get("averageRatingImg");
                        averageRatingImg.src   = response.averageRatingImage;
                        averageRatingImg.title = response.averageRating;
                        averageRatingImg.alt   = response.averageRating;
		        //Set ticket status as it may have been changed to pending after a comment was made
		        YAHOO.util.Dom.get("field_id_ticketStatus").innerHTML = response.ticketStatusField;
                        //Set the solution summary
                        WebGUI.Ticket.toggleSolutionRow();
                        //YAHOO.util.Dom.setStyle("solutionSummary_div","display","none");
                        var solutionSummary       = YAHOO.util.Dom.get("solution");
                        solutionSummary.innerHTML = response.solutionSummary;
                        //History is rebuilt by the saveFieldValue method in the other condition
                        WebGUI.Ticket.rebuildHistory();
                        WebGUI.Ticket.fixCommentPostButton(response.ticketStatus)
		        //Easter Egg for plainblack.com
		        WebGUI.Ticket.updateKarmaMessage(response.karmaLeft);
                    },
                    failure: function(o) {}
                });
            }
        },
        failure: function(o) {}
    };
    if(obj.close) {
        //close button clicked
        var closeField = YAHOO.util.Dom.get("closeTicket");
        if(closeField) {
            closeField.value="closed";    
        }
    }
    YAHOO.util.Connect.setForm(obj.form);
    YAHOO.util.Connect.asyncRequest('POST', url, oCallback);
};

//***********************************************************************************
WebGUI.Ticket.postKeywords = function (o , obj) {
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                var keywords       = YAHOO.util.Dom.get("keywordDiv");
                var keywordsStr    = "";
                for (i = 0; i < response.keywords.length; i++) {
                    if(i > 0) keywordsStr += obj.seperator;
                    keywordsStr += response.keywords[i];
                }
                keywords.innerHTML = keywordsStr;
            }
        }
    };
    YAHOO.util.Connect.setForm("keywordsForm");
    YAHOO.util.Connect.asyncRequest('POST', WebGUI.Ticket.postKeywordsUrl, oCallback);
}

//***********************************************************************************
WebGUI.Ticket.processErrors = function ( errors ) {
    if(typeof errors != 'object') errors = [];
    var message = "";
    for (var i = 0; i < errors.length; i++) {
        if(i > 0) message += "\n";
        message += errors[i];
    }
    return message;
}


//***********************************************************************************
WebGUI.Ticket.rebuildHistory = function () {
    var oCallback = {
        success: function(o) {
            var ticketHistory = YAHOO.util.Dom.get("ticketHistory");
            ticketHistory.innerHTML = o.responseText;
        },
        failure: function(o) {}
    };
    YAHOO.util.Connect.asyncRequest('GET', WebGUI.Ticket.historyUrl, oCallback);
};

//***********************************************************************************
WebGUI.Ticket.removeAllChildren = function( node ) {
    var children = YAHOO.util.Dom.getChildren(node);
    for(var i= 0; i < children.length; i++) {
        node.removeChild(children[i]);
    }
}

//***********************************************************************************
WebGUI.Ticket.saveInstantFieldValue = function(target, value) {
    var fieldId = target.name;
    var myURL = WebGUI.Ticket.saveUrl + ';fieldId=' + fieldId + ';value=' + escape( value );
   
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                WebGUI.Ticket.rebuildHistory();
            }
        },
        failure: function(o) {
                alert('URL Get failed:' + myURL);
             }
    };

    YAHOO.util.Connect.asyncRequest('GET', myURL, oCallback);
}

//***********************************************************************************
WebGUI.Ticket.saveKarmaScale = function(target) {
    WebGUI.Ticket.saveInstantFieldValue(target,target.value);
};
//***********************************************************************************
WebGUI.Ticket.saveTicketStatus = function(target) {
    var value = target.options[target.selectedIndex].value;
    // if the pending option is in the list, then remove it...
    // so the user can't change the value back to pending
    if( target.options[0].value == 'pending' ) {
        target.remove(0);
    }
    WebGUI.Ticket.saveInstantFieldValue(target,value);
    WebGUI.Ticket.fixCommentPostButton(value)
};
//***********************************************************************************
//  this function sets the label of the post comment button to re-open ticket
//    and creates the close ticket button if appropriate
    WebGUI.Ticket.fixCommentPostButton = function(ticketStatus) {
                        //change the button text if the status is now resolved
                        var commentsBtn = YAHOO.util.Dom.get("commentsBtn");
                        if(ticketStatus == "resolved") {
// TODO this should attach something else to be used as an indicator to the post comment function
                            commentsBtn.setAttribute("value",WebGUI.HelpDesk.i18n.get("Asset_Ticket","reopen ticket"));
                            if(WebGUI.Ticket.isOwner) {
                                var commentsButtonDiv = YAHOO.util.Dom.get("commentsButton_div");
                                //Add the close button if ticket is resolved and the user is the ticket owner and the closed button isn't already there
                                var closeButton = YAHOO.util.Dom.get("closeBtn");
                                if(closeButton == null) {
                                    closeButton = document.createElement("INPUT");
                                    closeButton.setAttribute("type","button");
                                    closeButton.setAttribute("value",WebGUI.HelpDesk.i18n.get("Asset_Ticket","confirm and close"));
                                    closeButton.setAttribute("name","closeBtn");
                                    closeButton.id ="closeBtn";
                                    YAHOO.util.Event.addListener(closeButton,"click", WebGUI.Ticket.postComment, { form : "commentsForm", close : true, closeBtn : closeButton });
                                    commentsButtonDiv.appendChild(closeButton);
                                }
                                //Add the close ticket hidden field if it doesn't exist already
                                var closeTicket = YAHOO.util.Dom.get("closeTicket");
                                if(closeTicket == null) {
                                    closeTicket = document.createElement("INPUT");
                                    closeTicket.setAttribute("type","hidden");
                                    closeTicket.setAttribute("name","close");
                                    closeTicket.id = "closeTicket";
                                    commentsButtonDiv.appendChild(closeTicket);
                                }                                
                            }
                        }
                        else {
                            commentsBtn.value="Post";
                            //The closed button isn't needed anymore since the ticket it closed so remove it.
                            var closeBtn  = YAHOO.util.Dom.get("closeBtn");
                            if(closeBtn) {
                                var btnParent = closeBtn.parentNode;
                                btnParent.removeChild(closeBtn);
                            }
                        }
                        YAHOO.util.Dom.get("commentsBtn").disabled = false;
                        //reset the closeTicket field if it exists (that way tickets aren't repeatedly closed.)
                        var closeField = YAHOO.util.Dom.get("closeTicket");
                        if(closeField) {
                            closeField.value="";    
                        }
}
//***********************************************************************************
WebGUI.Ticket.saveFieldValue = function(o, obj) {
    var button     = null;
    if(WebGUI.Ticket.statusChanged == true) {
        var href = YAHOO.util.Dom.get("statusLink");
        button = YAHOO.util.Dom.getFirstChild(href,function(node) {
            node.tagName == "INPUT"
        });
    }
    else {
        button = YAHOO.util.Event.getTarget(o);
    }
    var fieldId    = obj.fieldId;
    var valueField = YAHOO.util.Dom.get("field_id_"+fieldId);
    var formField  = WebGUI.Ticket.findFirstFormElement(valueField);
   
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                valueField.innerHTML = response.value;
                if( typeof(response.ratingImage) != "undefined" ) {
		    var ratingImageElement = document.getElementById(response.ratingId);
		    ratingImageElement.src = response.ratingImage;
		    ratingImageElement.title = response.rating;
                }
                var href             = YAHOO.util.Dom.getAncestorByTagName(button,"A");
                YAHOO.util.Event.removeListener(href,'click',WebGUI.Ticket.saveFieldValue);
                WebGUI.Ticket.removeAllChildren(href);
                var editButton = document.createElement("IMG");
                editButton.setAttribute("src",WebGUI.Ticket.buttonSrc);
                editButton.setAttribute("title","Change");
                editButton.setAttribute("alt","Change");
                YAHOO.util.Dom.setStyle(editButton,"border","0");
                YAHOO.util.Dom.setStyle(editButton,"vertical-align","middle");
                href.appendChild(editButton);
                YAHOO.util.Event.addListener(href,'click',WebGUI.Ticket.loadField,{ fieldId : obj.fieldId });
                //Rebuild the history
                WebGUI.Ticket.rebuildHistory();

                //Pop up the comment box when you change karma scale
                if(fieldId == "karmaScale") {
                    YAHOO.util.Dom.get("solution_formId").value = "Difficulty updated by " + response.username;
                    YAHOO.util.Dom.get("karmaRank").innerHTML = response.karmaRank;
                }
            }
        },
        failure: function(o) {}
    };

    YAHOO.util.Connect.setForm(formField.form);
    YAHOO.util.Connect.asyncRequest('POST', WebGUI.Ticket.saveUrl, oCallback);
}

//***********************************************************************************
//Sets who the ticket is assigned to
WebGUI.Ticket.setAssignment = function ( o, obj ) {
    var target     = YAHOO.util.Event.getTarget(o);
    var id         = target.id;
    var parts      = id.split("~");
    
    window.assignDialog.hide();
    var assignedTo = "unassigned";
    if(parts.length > 1) {
        assignedTo  = parts[1];
    }
    WebGUI.Ticket._setAssignment(assignedTo);
}

//***********************************************************************************
// assign the ticket to the current user...
WebGUI.Ticket.assignToMe = function ( o, obj ) {
    var target     = YAHOO.util.Event.getTarget(o);
    var id         = target.id;
    var parts      = id.split("~");
    
    window.assignDialog.hide();
    WebGUI.Ticket._setAssignment('Assign2Me');
}

//***********************************************************************************
//  this is the function that does the final assigment for 'setAssignment' and 'assignToMe'
WebGUI.Ticket._setAssignment = function (assignedTo) {
    var setAssignmentUrl   = WebGUI.Ticket.setAssignmentUrl + ";assignedTo=" + assignedTo;
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                YAHOO.util.Dom.get("assignedTo").innerHTML   = response.assignedTo;
                YAHOO.util.Dom.get("dateAssigned").innerHTML = response.dateAssigned;
                YAHOO.util.Dom.get("assignedBy").innerHTML   = response.assignedBy;
                WebGUI.Ticket.rebuildHistory();
            }
        }
    };
    YAHOO.util.Connect.asyncRequest('GET', setAssignmentUrl, oCallback);
};

//***********************************************************************************
WebGUI.Ticket.showAssignDialog = function (o) {
    var ticketStatus = YAHOO.util.Dom.get("ticketStatus_formId");
    if(ticketStatus.options[ticketStatus.selectedIndex] == "closed") {
        alert("You cannot assign a closed ticket.  Please reopen the ticket and try again");
    }
    else {
        window.assignDialog.show();
    }
}

//***********************************************************************************
//Function used to toggle the solution summary
//  TODO this needs to be changed so that internationalization doesn't break it
WebGUI.Ticket.toggleSolutionRow = function( ticketStatus ) {    
    var ticketStatus = YAHOO.util.Dom.get("ticketStatus_formId");
    var status = ticketStatus.options[ticketStatus.selectedIndex];
    if(status == "closed" || status == "resolved") {
        YAHOO.util.Dom.setStyle('solutionRow', 'display', '');
    }
    else {
        YAHOO.util.Dom.setStyle('solutionRow', 'display', 'none');
    }
};

//***********************************************************************************
//Function used to toggle the subscription
WebGUI.Ticket.toggleSubscription = function(evt) {
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                var message = "";
                for(var i = 0; i < response.errors.length; i++) {
                    message += response.errors[i];
                }
                alert(message);
            }
            else {
                YAHOO.util.Dom.get("ticketSubscribeLink").innerHTML = response.message;
            }   
        },
        failure: function(o) {}
    };
    YAHOO.util.Connect.asyncRequest('GET', WebGUI.Ticket.subscribeUrl, oCallback);
};

//***********************************************************************************
WebGUI.Ticket.transferKarma = function (o) {
    var karma = YAHOO.util.Dom.get("karmaAmount_formId").value;
    var url   = WebGUI.Ticket.transferKarmaUrl + ";karma=" + karma
    var oCallback = {
        success: function(o) {
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                YAHOO.util.Dom.get("karma").innerHTML     = response.karma;
                YAHOO.util.Dom.get("karmaRank").innerHTML = response.karmaRank;
                //Easter Egg for plainblack.com
                WebGUI.Ticket.updateKarmaMessage(response.karmaLeft);
                //Rebuild the history
                WebGUI.Ticket.rebuildHistory();
                YAHOO.util.Dom.get("karmaAmount_formId").value = "";
            }
        }
    };
    YAHOO.util.Connect.asyncRequest('GET',url, oCallback);
}

//***********************************************************************************
WebGUI.Ticket.updateKarmaMessage = function ( karma ) {
    if(karma == null) return;
    var links = document.getElementsByTagName('A');
    for(i = 0; i < links.length; i++) {
        var href = links[i].href;
        if(href.indexOf(WebGUI.Ticket.karmaUrl) > -1) {
            links[i].innerHTML = "You have "+ karma + " karma to spend.";
            return;
        }
    }
}

//***********************************************************************************
//Function used to process uploads
WebGUI.Ticket.uploadHandler = function (o) {
    var oCallback = {
        upload: function(o) {
            YAHOO.util.Dom.setStyle('indicator','visibility','hidden');
            var response = eval('(' + o.responseText + ')');
            if(response.hasError){
                alert(WebGUI.Ticket.processErrors(response.errors));
            }
            else {
                YAHOO.util.Connect.asyncRequest('GET', WebGUI.Ticket.listFileUrl, {
                    success: function (o) {
                        YAHOO.util.Dom.get('relatedFiles').innerHTML = o.responseText;
                        YAHOO.util.Dom.get('attachment_id').value    = '';
                    },
                    failure: function(o) {}
                });
            }   
        }
    };
    YAHOO.util.Dom.setStyle('indicator', 'visibility', 'visible');
    //the second argument of setForm is crucial which tells Connection Manager this is an file upload form
    YAHOO.util.Connect.setForm('fileUploadForm', true);
    YAHOO.util.Connect.asyncRequest('POST', WebGUI.Ticket.postFileUrl, oCallback);
};
